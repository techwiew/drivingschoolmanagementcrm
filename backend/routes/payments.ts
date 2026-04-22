import express from 'express';
import { PaymentStatus, Prisma, PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

type AuthUser = {
  userId: string;
  schoolId: string;
  role: 'ADMIN' | 'TRAINER' | 'STUDENT';
};

const getAuthUser = (req: express.Request, res: express.Response): AuthUser | null => {
  if (!req.user?.userId || !req.user.schoolId || !req.user.role) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return req.user as AuthUser;
};

const syncStudentPaymentSummary = async (
  tx: Prisma.TransactionClient,
  studentProfileId: string
) => {
  const [studentProfile, paidAggregate] = await Promise.all([
    tx.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: true }
    }),
    tx.payment.aggregate({
      where: { studentId: studentProfileId, status: 'PAID' },
      _sum: { amount: true }
    })
  ]);

  if (!studentProfile) {
    throw new Error('Student profile not found while syncing payment summary.');
  }

  const paidTotal = paidAggregate._sum.amount ?? 0;
  const agreedDealAmount = Math.max(studentProfile.totalPaid + studentProfile.balanceDue, paidTotal);

  return tx.studentProfile.update({
    where: { id: studentProfileId },
    data: {
      totalPaid: paidTotal,
      balanceDue: Math.max(agreedDealAmount - paidTotal, 0)
    },
    include: { user: true }
  });
};

// Get all payments for the school (or just student's own)
router.get('/', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const whereClause: any = { schoolId: authUser.schoolId };

    if (authUser.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } });
      if (studentProfile) whereClause.studentId = studentProfile.id;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: { student: { include: { user: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const paymentsWithSummary = payments.map((payment) => {
      const agreedDealAmount = Math.max((payment.student.totalPaid || 0) + (payment.student.balanceDue || 0), payment.amount);
      return {
        ...payment,
        dealAmount: agreedDealAmount,
        remainingAmount: Math.max(payment.student.balanceDue || 0, 0)
      };
    });

    res.json(paymentsWithSummary);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
});

// Record a new payment (admin only)
router.post('/', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;
    if (authUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can record payments' });

    const { studentId, amount, method, status, notes } = req.body;
    if (!studentId || amount === undefined) {
      return res.status(400).json({ error: 'studentId and amount are required' });
    }

    const parsedAmount = parseFloat(String(amount));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Cannot record payment because the amount is invalid.' });
    }

    let resolvedStudentId = String(studentId);
    const studentByUserId = await prisma.studentProfile.findFirst({
      where: {
        userId: resolvedStudentId,
        user: { schoolId: authUser.schoolId, role: 'STUDENT' }
      }
    });

    if (studentByUserId) {
      resolvedStudentId = studentByUserId.id;
    } else {
      const directProfile = await prisma.studentProfile.findFirst({
        where: {
          id: resolvedStudentId,
          user: { schoolId: authUser.schoolId, role: 'STUDENT' }
        }
      });
      if (!directProfile) {
        return res.status(400).json({ error: 'Student profile not found for the given ID' });
      }
      resolvedStudentId = directProfile.id;
    }

    const paymentStatus = String(status || 'PAID').toUpperCase() as PaymentStatus;
    if (!['PAID', 'PENDING', 'FAILED'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Cannot record payment because the status is invalid.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          schoolId: authUser.schoolId,
          studentId: resolvedStudentId,
          amount: parsedAmount,
          method: method || 'CASH',
          status: paymentStatus,
          notes: notes || null,
          dueDate: new Date()
        },
        include: { student: { include: { user: true } } }
      });

      const updatedProfile = await syncStudentPaymentSummary(tx, resolvedStudentId);

      return { payment, updatedProfile };
    });

    res.status(201).json({
      message: `Collected ${result.payment.amount.toFixed(2)} from ${result.payment.student.user.firstName} ${result.payment.student.user.lastName}. Remaining balance: ${Math.max(result.updatedProfile.balanceDue, 0).toFixed(2)}.`,
      payment: result.payment,
      studentProfile: result.updatedProfile,
      collectedAmount: result.payment.status === 'PAID' ? result.payment.amount : 0,
      remainingAmount: Math.max(result.updatedProfile.balanceDue, 0)
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record payment', details: error.message });
  }
});

// Update payment status
router.patch('/:id/status', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;
    if (authUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can update payment status' });

    const nextStatus = String(req.body.status || '').toUpperCase() as PaymentStatus;
    if (!['PAID', 'PENDING', 'FAILED'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Cannot update payment because the status is invalid.' });
    }

    const existing = await prisma.payment.findFirst({
      where: { id: String(req.params.id), schoolId: authUser.schoolId },
      include: { student: { include: { user: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Payment not found' });

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: existing.id },
        data: { status: nextStatus },
        include: { student: { include: { user: true } } }
      });

      const updatedProfile = await syncStudentPaymentSummary(tx, existing.studentId);
      const newlyCollected = existing.status !== 'PAID' && nextStatus === 'PAID';

      return { payment, updatedProfile, newlyCollected };
    });

    res.json({
      message: result.newlyCollected
        ? `Collected ${existing.amount.toFixed(2)} from ${existing.student.user.firstName} ${existing.student.user.lastName}. Remaining balance: ${Math.max(result.updatedProfile.balanceDue, 0).toFixed(2)}.`
        : 'Payment status updated.',
      payment: result.payment,
      collectedAmount: result.newlyCollected ? existing.amount : 0,
      remainingAmount: Math.max(result.updatedProfile.balanceDue, 0)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update payment', details: error.message });
  }
});

export default router;
