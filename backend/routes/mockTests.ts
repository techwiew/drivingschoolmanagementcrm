import express from 'express';
import { PrismaClient } from '@prisma/client';

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

// Get all mock tests
router.get('/', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const tests = await prisma.mockTest.findMany({
      where: { schoolId: authUser.schoolId },
      include: { questions: true, results: true }
    });
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch mock tests', details: error.message });
  }
});

// Create a new mock test (admin only)
router.post('/', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;
    if (authUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can create mock tests' });

    const { title, description, passingScore, timeLimitMinutes } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const test = await prisma.mockTest.create({
      data: {
        schoolId: authUser.schoolId,
        title,
        description: description || null,
        passingScore: parseInt(String(passingScore)) || 80,
        timeLimitMinutes: parseInt(String(timeLimitMinutes)) || 60
      }
    });

    res.status(201).json({ message: 'Mock Test created successfully', test });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create mock test', details: error.message });
  }
});

// Add question to a test (admin only)
router.post('/:testId/questions', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;
    if (authUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can add questions' });

    const { text, options, correctAnswer } = req.body;
    if (!text || !Array.isArray(options) || !correctAnswer) {
      return res.status(400).json({ error: 'text, options[], and correctAnswer are required' });
    }

    const question = await prisma.question.create({
      data: {
        testId: String(req.params.testId),
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
    const authUser = getAuthUser(req, res);
    if (!authUser) return;
    if (authUser.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can submit tests' });

    const { answers } = req.body as { answers: Record<string, string> };
    const test = await prisma.mockTest.findUnique({
      where: { id: String(req.params.testId) },
      include: { questions: true }
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    let correct = 0;
    for (const question of test.questions) {
      if (answers?.[question.id] === question.correctAnswer) correct++;
    }
    const score = test.questions.length > 0 ? Math.round((correct / test.questions.length) * 100) : 0;

    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } });
    if (!studentProfile) return res.status(400).json({ error: 'Student profile not found' });

    const result = await prisma.testResult.create({
      data: {
        testId: String(req.params.testId),
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
