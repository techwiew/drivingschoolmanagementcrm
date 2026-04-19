import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all mock tests
router.get('/', async (req, res) => {
  try {
    const tests = await prisma.mockTest.findMany({
      where: { schoolId: req.user.schoolId },
      include: {
        questions: true,
        results: true
      }
    });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mock tests' });
  }
});

// Create a new mock test
router.post('/', async (req, res) => {
  try {
    const { title, description, passingScore, timeLimitMinutes } = req.body;
    
    const test = await prisma.mockTest.create({
      data: {
        schoolId: req.user.schoolId,
        title,
        timeLimitMinutes: parseInt(timeLimitMinutes) || 60
      }
    });
    
    res.json({ message: 'Mock Test created successfully', test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create mock test' });
  }
});

export default router;
