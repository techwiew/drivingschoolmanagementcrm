import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const ROAD_SAFETY_TEST = {
  title: 'Road Safety Essentials',
  description: 'A 15-question driving theory challenge covering signals, crossings, safety rules, weather driving, and emergency response.',
  passingScore: 70,
  timeLimitMinutes: 8,
  questions: [
    {
      text: 'What does a red traffic light mean?',
      options: ['Slow down', 'Stop', 'Go if clear', 'Turn right only'],
      correctAnswer: 'Stop'
    },
    {
      text: 'What should you do when approaching a pedestrian crossing?',
      options: ['Speed up', 'Honk continuously', 'Slow down and prepare to stop', 'Ignore pedestrians'],
      correctAnswer: 'Slow down and prepare to stop'
    },
    {
      text: 'What is the purpose of a seatbelt?',
      options: ['To make driving comfortable', 'To avoid police fines only', 'To reduce injury during accidents', 'To improve fuel efficiency'],
      correctAnswer: 'To reduce injury during accidents'
    },
    {
      text: 'What does a flashing yellow traffic signal mean?',
      options: ['Stop immediately', 'Proceed with caution', 'Speed up', 'Turn left only'],
      correctAnswer: 'Proceed with caution'
    },
    {
      text: 'When should you use turn signals?',
      options: ['Only at night', 'Only in heavy traffic', 'Before changing direction or lanes', 'Never'],
      correctAnswer: 'Before changing direction or lanes'
    },
    {
      text: 'What is the legal blood alcohol limit for most drivers?',
      options: ['0.08% (varies by region)', '0.5%', '1.0%', 'No limit'],
      correctAnswer: '0.08% (varies by region)'
    },
    {
      text: 'What does a solid white line on the road mean?',
      options: ['Overtaking allowed', 'Lane change discouraged', 'Parking allowed', 'No speed limit'],
      correctAnswer: 'Lane change discouraged'
    },
    {
      text: 'When driving in rain, you should:',
      options: ['Drive faster', 'Turn off headlights', 'Increase following distance', 'Use hazard lights always'],
      correctAnswer: 'Increase following distance'
    },
    {
      text: 'What should you do if an emergency vehicle approaches with sirens?',
      options: ['Continue driving normally', 'Speed up', 'Pull over and give way', 'Stop in the middle of road'],
      correctAnswer: 'Pull over and give way'
    },
    {
      text: 'What is the safe following distance rule?',
      options: ['1-second rule', '2-second rule', '3-second rule (or more in bad weather)', 'No rule'],
      correctAnswer: '3-second rule (or more in bad weather)'
    },
    {
      text: 'What does a STOP sign require?',
      options: ['Slow down', 'Stop completely', 'Honk', 'Turn only'],
      correctAnswer: 'Stop completely'
    },
    {
      text: 'When reversing your vehicle, you should:',
      options: ['Rely only on mirrors', 'Turn around and look behind', 'Close your eyes', 'Honk continuously'],
      correctAnswer: 'Turn around and look behind'
    },
    {
      text: 'What does a yellow center line mean?',
      options: ['No vehicles allowed', 'Divides traffic moving in opposite directions', 'Parking lane', 'Bus lane'],
      correctAnswer: 'Divides traffic moving in opposite directions'
    },
    {
      text: 'When should you use headlights?',
      options: ['Only at night', 'During low visibility (rain, fog, dusk)', 'Only in city', 'Only on highways'],
      correctAnswer: 'During low visibility (rain, fog, dusk)'
    },
    {
      text: 'Using a mobile phone while driving is:',
      options: ['Safe', 'Allowed anytime', 'Dangerous and often illegal', 'Recommended'],
      correctAnswer: 'Dangerous and often illegal'
    }
  ]
};

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

const includeMockTestRelations = {
  questions: true,
  results: true
} as const;

const normalizeTest = <T extends { questions: Array<{ options: string }> }>(test: T) => ({
  ...test,
  questions: test.questions.map((question) => ({
    ...question,
    options: JSON.parse(question.options)
  }))
});

// Get all mock tests
router.get('/', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;

    const studentProfile = authUser.role === 'STUDENT'
      ? await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } })
      : null;

    const tests = await prisma.mockTest.findMany({
      where: { schoolId: authUser.schoolId },
      include: {
        questions: true,
        results: authUser.role === 'STUDENT'
          ? { where: studentProfile ? { studentId: studentProfile.id } : { id: '__no-results__' } }
          : true
      },
      orderBy: { title: 'asc' as const }
    });
    res.json(tests.map(normalizeTest));
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

// Seed the built-in road safety test (admin only)
router.post('/seed-road-safety', async (req, res) => {
  try {
    const authUser = getAuthUser(req, res);
    if (!authUser) return;
    if (authUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can seed mock tests' });

    const result = await prisma.$transaction(async (tx) => {
      let test = await tx.mockTest.findFirst({
        where: { schoolId: authUser.schoolId, title: ROAD_SAFETY_TEST.title }
      });

      if (!test) {
        test = await tx.mockTest.create({
          data: {
            schoolId: authUser.schoolId,
            title: ROAD_SAFETY_TEST.title,
            description: ROAD_SAFETY_TEST.description,
            passingScore: ROAD_SAFETY_TEST.passingScore,
            timeLimitMinutes: ROAD_SAFETY_TEST.timeLimitMinutes
          }
        });
      } else {
        test = await tx.mockTest.update({
          where: { id: test.id },
          data: {
            description: ROAD_SAFETY_TEST.description,
            passingScore: ROAD_SAFETY_TEST.passingScore,
            timeLimitMinutes: ROAD_SAFETY_TEST.timeLimitMinutes
          }
        });
      }

      await tx.question.deleteMany({ where: { testId: test.id } });
      await tx.question.createMany({
        data: ROAD_SAFETY_TEST.questions.map((question) => ({
          testId: test.id,
          text: question.text,
          options: JSON.stringify(question.options),
          correctAnswer: question.correctAnswer
        }))
      });

      return tx.mockTest.findUnique({
        where: { id: test.id },
        include: includeMockTestRelations
      });
    });

    res.status(201).json({
      message: 'Road safety mock test is ready.',
      test: result
        ? normalizeTest(result)
        : null
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to seed road safety mock test', details: error.message });
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

    const detailedQuestions = test.questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: JSON.parse(question.options),
      correctAnswer: question.correctAnswer,
      selectedAnswer: answers?.[question.id] || null,
      isCorrect: answers?.[question.id] === question.correctAnswer
    }));

    res.json({
      message: 'Test submitted',
      result,
      score,
      passed: score >= test.passingScore,
      correctCount: correct,
      totalQuestions: test.questions.length,
      review: detailedQuestions
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit test', details: error.message });
  }
});

export default router;
