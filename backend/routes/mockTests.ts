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
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch mock tests', details: error.message });
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
        description: description || null,
        passingScore: parseInt(passingScore) || 80,
        timeLimitMinutes: parseInt(timeLimitMinutes) || 60
      }
    });

    res.json({ message: 'Mock Test created successfully', test });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create mock test', details: error.message });
  }
});

// Add question to a test
router.post('/:testId/questions', async (req, res) => {
  try {
    const { text, options, correctAnswer } = req.body;
    const question = await prisma.question.create({
      data: {
        testId: req.params.testId,
        text,
        options: JSON.stringify(options),
        correctAnswer
      }
    });
    res.json({ message: 'Question added', question });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add question', details: error.message });
  }
});

// Submit test result (student)
router.post('/:testId/submit', async (req, res) => {
  try {
    const { answers } = req.body; // { questionId: selectedAnswer }
    const test = await prisma.mockTest.findUnique({
      where: { id: req.params.testId },
      include: { questions: true }
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Calculate score
    let correct = 0;
    for (const question of test.questions) {
      if (answers[question.id] === question.correctAnswer) correct++;
    }
    const score = test.questions.length > 0 ? Math.round((correct / test.questions.length) * 100) : 0;

    // Find student profile
    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
    if (!studentProfile) return res.status(400).json({ error: 'Student profile not found' });

    const result = await prisma.testResult.create({
      data: {
        testId: req.params.testId,
        studentId: studentProfile.id,
        score
      }
    });

    res.json({ message: 'Test submitted', result, score, passed: score >= test.passingScore });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit test', details: error.message });
  }
});

export default router;
