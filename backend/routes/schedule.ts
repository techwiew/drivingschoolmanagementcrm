import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

type AuthUser = {
  userId: string;
  role: 'ADMIN' | 'TRAINER' | 'STUDENT';
  schoolId: string;
};

const getAuthUser = (req: express.Request): AuthUser => req.user as AuthUser;

const ensureRoles = (
  req: express.Request,
  res: express.Response,
  roles: Array<AuthUser['role']>
) => {
  const authUser = getAuthUser(req);
  if (!roles.includes(authUser.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return authUser;
};

const resolveTrainerProfile = async (trainerId: string) => {
  const byUserId = await prisma.trainerProfile.findUnique({ where: { userId: trainerId } });
  if (byUserId) return byUserId;
  return prisma.trainerProfile.findUnique({ where: { id: trainerId } });
};

const resolveStudentProfile = async (studentId: string) => {
  const byUserId = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
  if (byUserId) return byUserId;
  return prisma.studentProfile.findUnique({ where: { id: studentId } });
};

const scheduleInclude = {
  course: true,
  trainer: { include: { user: true } },
  student: { include: { user: true } },
  attendances: { include: { student: { include: { user: true } } } }
};

// Get schedules (role-aware)
router.get('/', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    let whereClause: any = { schoolId: authUser.schoolId };

    if (authUser.role === 'TRAINER') {
      const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: authUser.userId } });
      if (!trainerProfile) return res.json([]);
      whereClause = { ...whereClause, trainerId: trainerProfile.id };
    }

    if (authUser.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } });
      if (!studentProfile) return res.json([]);
      whereClause = { ...whereClause, studentId: studentProfile.id };
    }

    const schedules = await prisma.classSchedule.findMany({
      where: whereClause,
      include: scheduleInclude,
      orderBy: { startTime: 'asc' }
    });

    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch schedules', details: error.message });
  }
});

// Create schedule (admin)
router.post('/', async (req, res) => {
  try {
    const authUser = ensureRoles(req, res, ['ADMIN']);
    if (!authUser) return;

    const { courseId, trainerId, studentId, startTime, notes } = req.body;
    if (!trainerId || !studentId || !startTime) {
      return res.status(400).json({ error: 'trainerId, studentId and startTime are required' });
    }

    let validCourseId = courseId;
    if (!validCourseId) {
      const course = await prisma.course.findFirst({ where: { schoolId: authUser.schoolId } });
      if (course) {
        validCourseId = course.id;
      } else {
        const newCourse = await prisma.course.create({
          data: { schoolId: authUser.schoolId, title: 'Defensive Driving Module 1', durationDays: 30, price: 500 }
        });
        validCourseId = newCourse.id;
      }
    }

    const trainerProfile = await resolveTrainerProfile(trainerId);
    if (!trainerProfile) {
      return res.status(400).json({ error: 'Trainer profile not found. Make sure this user has a trainer profile.' });
    }

    const studentProfile = await resolveStudentProfile(studentId);
    if (!studentProfile) {
      return res.status(400).json({ error: 'Student profile not found. Make sure this user has a student profile.' });
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        schoolId: authUser.schoolId,
        courseId: validCourseId,
        trainerId: trainerProfile.id,
        studentId: studentProfile.id,
        startTime: new Date(startTime),
        endTime: null,
        notes: notes || null
      },
      include: scheduleInclude
    });

    res.status(201).json({ message: 'Schedule created', schedule });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create schedule', details: error.message });
  }
});

// Edit schedule (admin)
router.put('/:id', async (req, res) => {
  try {
    const authUser = ensureRoles(req, res, ['ADMIN']);
    if (!authUser) return;

    const existing = await prisma.classSchedule.findFirst({
      where: { id: req.params.id, schoolId: authUser.schoolId },
      include: { trainer: true, student: true }
    });

    if (!existing) return res.status(404).json({ error: 'Schedule not found' });

    const { trainerId, studentId, startTime, status, notes, courseId } = req.body;

    let resolvedTrainerId = existing.trainerId;
    if (trainerId) {
      const trainerProfile = await resolveTrainerProfile(trainerId);
      if (!trainerProfile) return res.status(400).json({ error: 'Trainer profile not found' });
      resolvedTrainerId = trainerProfile.id;
    }

    let resolvedStudentId = existing.studentId;
    if (studentId) {
      const studentProfile = await resolveStudentProfile(studentId);
      if (!studentProfile) return res.status(400).json({ error: 'Student profile not found' });
      resolvedStudentId = studentProfile.id;
    }

    const schedule = await prisma.classSchedule.update({
      where: { id: req.params.id },
      data: {
        trainerId: resolvedTrainerId,
        studentId: resolvedStudentId || null,
        startTime: startTime ? new Date(startTime) : existing.startTime,
        endTime: null,
        status: status || existing.status,
        notes: typeof notes === 'string' ? notes : existing.notes,
        courseId: courseId || existing.courseId
      },
      include: scheduleInclude
    });

    res.json({ message: 'Schedule updated', schedule });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update schedule', details: error.message });
  }
});

// Update schedule status (admin/trainer)
router.patch('/:id/status', async (req, res) => {
  try {
    const authUser = ensureRoles(req, res, ['ADMIN', 'TRAINER']);
    if (!authUser) return;

    const { status } = req.body;
    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const schedule = await prisma.classSchedule.findFirst({
      where: { id: req.params.id, schoolId: authUser.schoolId },
      include: { trainer: true }
    });

    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    if (authUser.role === 'TRAINER' && schedule.trainer.userId !== authUser.userId) {
      return res.status(403).json({ error: 'You can only update status of your assigned classes' });
    }

    const updated = await prisma.classSchedule.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json({ message: 'Schedule updated', schedule: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update schedule', details: error.message });
  }
});

// Delete schedule (admin)
router.delete('/:id', async (req, res) => {
  try {
    const authUser = ensureRoles(req, res, ['ADMIN']);
    if (!authUser) return;

    const schedule = await prisma.classSchedule.findFirst({
      where: { id: req.params.id, schoolId: authUser.schoolId }
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { scheduleId: schedule.id } }),
      prisma.classSchedule.delete({ where: { id: schedule.id } })
    ]);

    res.json({ message: 'Schedule deleted successfully', scheduleId: schedule.id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete schedule', details: error.message });
  }
});

// Mark attendance for a class (admin/trainer)
router.post('/:id/attendance', async (req, res) => {
  try {
    const authUser = ensureRoles(req, res, ['ADMIN', 'TRAINER']);
    if (!authUser) return;

    const { attendance } = req.body as { attendance: Array<{ studentProfileId: string; status: 'PRESENT' | 'ABSENT' }> };
    if (!Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({ error: 'attendance array is required' });
    }

    const schedule = await prisma.classSchedule.findFirst({
      where: { id: req.params.id, schoolId: authUser.schoolId },
      include: { trainer: true }
    });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    if (authUser.role === 'TRAINER' && schedule.trainer.userId !== authUser.userId) {
      return res.status(403).json({ error: 'You can only mark attendance for your assigned classes' });
    }

    const results = [];
    for (const entry of attendance) {
      if (!['PRESENT', 'ABSENT'].includes(entry.status)) {
        return res.status(400).json({ error: 'Invalid attendance status' });
      }

      if (schedule.studentId && entry.studentProfileId !== schedule.studentId) {
        return res.status(400).json({ error: 'Attendance can only be marked for the assigned student' });
      }

      const existing = await prisma.attendance.findFirst({
        where: { scheduleId: req.params.id, studentId: entry.studentProfileId }
      });

      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: { status: entry.status, markedBy: authUser.userId }
        });
        results.push(updated);
      } else {
        const created = await prisma.attendance.create({
          data: {
            scheduleId: req.params.id,
            studentId: entry.studentProfileId,
            status: entry.status,
            markedBy: authUser.userId
          }
        });
        results.push(created);
      }
    }

    res.json({ message: 'Attendance saved', results });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark attendance', details: error.message });
  }
});

// Edit a single attendance record (admin/trainer)
router.put('/:scheduleId/attendance/:attendanceId', async (req, res) => {
  try {
    const authUser = ensureRoles(req, res, ['ADMIN', 'TRAINER']);
    if (!authUser) return;

    const { status } = req.body as { status: 'PRESENT' | 'ABSENT' };
    if (!['PRESENT', 'ABSENT'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    const schedule = await prisma.classSchedule.findFirst({
      where: { id: req.params.scheduleId, schoolId: authUser.schoolId },
      include: { trainer: true }
    });

    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    if (authUser.role === 'TRAINER' && schedule.trainer.userId !== authUser.userId) {
      return res.status(403).json({ error: 'You can only edit attendance for your assigned classes' });
    }

    const attendance = await prisma.attendance.findFirst({
      where: { id: req.params.attendanceId, scheduleId: req.params.scheduleId }
    });
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { status, markedBy: authUser.userId }
    });

    res.json({ message: 'Attendance updated', attendance: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to edit attendance', details: error.message });
  }
});

// Get students for a schedule (role-aware)
router.get('/:id/students', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const schedule = await prisma.classSchedule.findFirst({
      where: { id: req.params.id, schoolId: authUser.schoolId },
      include: { trainer: true }
    });

    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    if (authUser.role === 'TRAINER' && schedule.trainer.userId !== authUser.userId) {
      return res.status(403).json({ error: 'You can only view students for your assigned classes' });
    }

    if (authUser.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: authUser.userId },
        include: { user: true }
      });
      if (!studentProfile || schedule.studentId !== studentProfile.id) return res.json([]);

      const attendance = await prisma.attendance.findFirst({
        where: { scheduleId: schedule.id, studentId: studentProfile.id }
      });
      return res.json([{ ...studentProfile, attendance }]);
    }

    if (schedule.studentId) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: schedule.studentId },
        include: { user: true }
      });

      if (!student) return res.json([]);
      const attendance = await prisma.attendance.findFirst({
        where: { scheduleId: schedule.id, studentId: student.id }
      });
      return res.json([{ ...student, attendance }]);
    }

    if (authUser.role === 'ADMIN') {
      const students = await prisma.studentProfile.findMany({
        where: { user: { schoolId: authUser.schoolId } },
        include: { user: true }
      });

      const scheduleAttendances = await prisma.attendance.findMany({
        where: { scheduleId: schedule.id }
      });

      const studentsWithAttendance = students.map((s) => ({
        ...s,
        attendance: scheduleAttendances.find((a) => a.studentId === s.id) || null
      }));

      return res.json(studentsWithAttendance);
    }

    return res.json([]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

export default router;
