"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get schedules (role-aware)
router.get('/', async (req, res) => {
    try {
        let schedules;
        if (req.user.role === 'TRAINER') {
            // Trainer only sees their own classes
            const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: req.user.userId } });
            if (!trainerProfile)
                return res.json([]);
            schedules = await prisma.classSchedule.findMany({
                where: { trainerId: trainerProfile.id },
                include: {
                    course: true,
                    trainer: { include: { user: true } },
                    attendances: { include: { student: { include: { user: true } } } }
                },
                orderBy: { startTime: 'asc' }
            });
        }
        else if (req.user.role === 'STUDENT') {
            // Student sees all scheduled classes for their school
            schedules = await prisma.classSchedule.findMany({
                where: { schoolId: req.user.schoolId },
                include: {
                    course: true,
                    trainer: { include: { user: true } },
                    attendances: { include: { student: { include: { user: true } } } }
                },
                orderBy: { startTime: 'asc' }
            });
        }
        else {
            // Admin sees all
            schedules = await prisma.classSchedule.findMany({
                where: { schoolId: req.user.schoolId },
                include: {
                    course: true,
                    trainer: { include: { user: true } },
                    attendances: { include: { student: { include: { user: true } } } }
                },
                orderBy: { startTime: 'asc' }
            });
        }
        res.json(schedules);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules', details: error.message });
    }
});
// Create schedule (admin)
router.post('/', async (req, res) => {
    try {
        const { courseId, trainerId, startTime, endTime } = req.body;
        let validCourseId = courseId;
        if (!validCourseId) {
            const course = await prisma.course.findFirst({ where: { schoolId: req.user.schoolId } });
            if (course) {
                validCourseId = course.id;
            }
            else {
                const newCourse = await prisma.course.create({
                    data: { schoolId: req.user.schoolId, title: 'Defensive Driving Module 1', durationDays: 30, price: 500 }
                });
                validCourseId = newCourse.id;
            }
        }
        // trainerId from frontend is User.id — resolve to TrainerProfile.id
        const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: trainerId } });
        if (!trainerProfile) {
            return res.status(400).json({ error: 'Trainer profile not found. Make sure this user has a trainer profile.' });
        }
        const schedule = await prisma.classSchedule.create({
            data: {
                schoolId: req.user.schoolId,
                courseId: validCourseId,
                trainerId: trainerProfile.id,
                startTime: new Date(startTime),
                endTime: new Date(endTime)
            },
            include: { course: true, trainer: { include: { user: true } } }
        });
        res.json({ message: 'Schedule created', schedule });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create schedule', details: error.message });
    }
});
// Update schedule status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const schedule = await prisma.classSchedule.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ message: 'Schedule updated', schedule });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update schedule', details: error.message });
    }
});
// Mark attendance for a class (trainer)
router.post('/:id/attendance', async (req, res) => {
    try {
        const { attendance } = req.body; // [{ studentProfileId, status }]
        const results = [];
        for (const entry of attendance) {
            const existing = await prisma.attendance.findFirst({
                where: { scheduleId: req.params.id, studentId: entry.studentProfileId }
            });
            if (existing) {
                const updated = await prisma.attendance.update({
                    where: { id: existing.id },
                    data: { status: entry.status }
                });
                results.push(updated);
            }
            else {
                const created = await prisma.attendance.create({
                    data: {
                        scheduleId: req.params.id,
                        studentId: entry.studentProfileId,
                        status: entry.status,
                        markedBy: req.user.userId
                    }
                });
                results.push(created);
            }
        }
        res.json({ message: 'Attendance marked', results });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to mark attendance', details: error.message });
    }
});
// Get students for a schedule (for attendance marking)
router.get('/:id/students', async (req, res) => {
    try {
        const students = await prisma.studentProfile.findMany({
            where: { user: { schoolId: req.user.schoolId } },
            include: { user: true }
        });
        const schedule = await prisma.classSchedule.findUnique({
            where: { id: req.params.id },
            include: { attendances: true }
        });
        const studentsWithAttendance = students.map(s => ({
            ...s,
            attendance: schedule?.attendances.find(a => a.studentId === s.id) || null
        }));
        res.json(studentsWithAttendance);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch students', details: error.message });
    }
});
exports.default = router;
