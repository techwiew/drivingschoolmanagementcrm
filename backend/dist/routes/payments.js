"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get all payments for the school (or just student's own)
router.get('/', async (req, res) => {
    try {
        const whereClause = { schoolId: req.user.schoolId };
        // If student, only show their payments
        if (req.user.role === 'STUDENT') {
            const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
            if (studentProfile) {
                whereClause.studentId = studentProfile.id;
            }
        }
        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                student: { include: { user: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
    }
});
// Record a new payment (admin only)
router.post('/', async (req, res) => {
    try {
        const { studentId, amount, method, status, notes } = req.body;
        // studentId from frontend is a User.id — resolve to StudentProfile.id
        let resolvedStudentId = studentId;
        const student = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
        if (student) {
            resolvedStudentId = student.id;
        }
        else {
            // Maybe they passed a StudentProfile.id directly
            const directProfile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
            if (!directProfile) {
                return res.status(400).json({ error: 'Student profile not found for the given ID' });
            }
            resolvedStudentId = directProfile.id;
        }
        const payment = await prisma.payment.create({
            data: {
                schoolId: req.user.schoolId,
                studentId: resolvedStudentId,
                amount: parseFloat(amount),
                method: method || 'CASH',
                status: status || 'PAID',
                notes: notes || null,
                dueDate: new Date()
            },
            include: { student: { include: { user: true } } }
        });
        res.json({ message: 'Payment recorded successfully', payment });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record payment', details: error.message });
    }
});
// Update payment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const payment = await prisma.payment.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ message: 'Payment status updated', payment });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update payment', details: error.message });
    }
});
exports.default = router;
