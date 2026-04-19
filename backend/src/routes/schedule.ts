import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all schedules
router.get('/', async (req, res) => {
  try {
    const schedules = await prisma.classSchedule.findMany({
      where: { schoolId: req.user.schoolId },
      include: {
        course: true,
        trainer: { include: { user: true } },
        attendances: { include: { student: { include: { user: true } } } }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create a schedule
router.post('/', async (req, res) => {
  try {
    const { courseId, trainerId, startTime, endTime } = req.body;
    
    // Check if courseId is provided, otherwise create a default one for demo
    let validCourseId = courseId;
    if (!validCourseId) {
      const course = await prisma.course.findFirst({ where: { schoolId: req.user.schoolId } });
      if (course) {
        validCourseId = course.id;
      } else {
        const newCourse = await prisma.course.create({
          data: { schoolId: req.user.schoolId, title: 'Defensive Driving Module 1', durationDays: 30, price: 500 }
        });
        validCourseId = newCourse.id;
      }
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        schoolId: req.user.schoolId,
        courseId: validCourseId,
        trainerId,
        startTime: new Date(startTime),
        endTime: new Date(endTime)
      },
      include: { course: true, trainer: { include: { user: true } } }
    });
    res.json({ message: 'Schedule created', schedule });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

export default router;
