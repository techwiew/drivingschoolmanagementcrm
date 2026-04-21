"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const getAuthUser = (req, res) => {
    if (!req.user?.userId || !req.user.schoolId || !req.user.role) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }
    return req.user;
};
// Get all payments for the school (or just student's own)
router.get('/', async (req, res) => {
    try {
        const authUser = getAuthUser(req, res);
        if (!authUser)
            return;
        const whereClause = { schoolId: authUser.schoolId };
        if (authUser.role === 'STUDENT') {
            const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } });
            if (studentProfile)
                whereClause.studentId = studentProfile.id;
        }
        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: { student: { include: { user: true } } },
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
        const authUser = getAuthUser(req, res);
        if (!authUser)
            return;
        if (authUser.role !== 'ADMIN')
            return res.status(403).json({ error: 'Only admin can record payments' });
        const { studentId, amount, method, status, notes } = req.body;
        if (!studentId || amount === undefined) {
            return res.status(400).json({ error: 'studentId and amount are required' });
        }
        let resolvedStudentId = String(studentId);
        const studentByUserId = await prisma.studentProfile.findUnique({ where: { userId: resolvedStudentId } });
        if (studentByUserId) {
            resolvedStudentId = studentByUserId.id;
        }
        else {
            const directProfile = await prisma.studentProfile.findUnique({ where: { id: resolvedStudentId } });
            if (!directProfile) {
                return res.status(400).json({ error: 'Student profile not found for the given ID' });
            }
            resolvedStudentId = directProfile.id;
        }
        const payment = await prisma.payment.create({
            data: {
                schoolId: authUser.schoolId,
                studentId: resolvedStudentId,
                amount: parseFloat(String(amount)),
                method: method || 'CASH',
                status: status || 'PAID',
                notes: notes || null,
                dueDate: new Date()
            },
            include: { student: { include: { user: true } } }
        });
        res.status(201).json({ message: 'Payment recorded successfully', payment });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record payment', details: error.message });
    }
});
// Update payment status
router.patch('/:id/status', async (req, res) => {
    try {
        const authUser = getAuthUser(req, res);
        if (!authUser)
            return;
        if (authUser.role !== 'ADMIN')
            return res.status(403).json({ error: 'Only admin can update payment status' });
        const { status } = req.body;
        const payment = await prisma.payment.update({
            where: { id: String(req.params.id) },
            data: { status }
        });
        res.json({ message: 'Payment status updated', payment });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update payment', details: error.message });
    }
});
exports.default = router;
