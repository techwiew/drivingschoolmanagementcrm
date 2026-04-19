import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all payments for the school
router.get('/', async (req, res) => {
  try {
    const whereClause: any = { schoolId: req.user.schoolId };
    
    // If student, only show their payments
    if (req.user.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId }});
      if (studentProfile) {
        whereClause.studentId = studentProfile.id;
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true } }
      }
    });
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Record a new payment
router.post('/', async (req, res) => {
  try {
    const { studentId, amount, method, status } = req.body;
    
    // Admin creates payment
    const payment = await prisma.payment.create({
      data: {
        schoolId: req.user.schoolId,
        studentId,
        amount: parseFloat(amount),
        status: status || 'COMPLETED',
        dueDate: new Date()
      },
      include: { student: { include: { user: true } } }
    });
    
    res.json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

export default router;
