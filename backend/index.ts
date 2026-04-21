import express, { NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import scheduleRouter from './routes/schedule';
import paymentRouter from './routes/payments';
import mockTestRouter from './routes/mockTests';

dotenv.config();

type TokenRole = 'ADMIN' | 'TRAINER' | 'STUDENT' | 'SUPER_ADMIN';
type AuthTokenPayload = {
  userId?: string;
  schoolId?: string;
  role: TokenRole;
  superAdminId?: string;
  email?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'driveflow-secret-2024';

const corsOptions: CorsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Handle Vercel-style routing locally and on cPanel
app.use((req, res, next) => {
  if (req.url.startsWith('/_/backend/api')) {
    req.url = req.url.replace('/_/backend/api', '/api');
  }
  next();
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }
});

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded as AuthTokenPayload;
    next();
  });
};

const requireRoles = (...roles: TokenRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

const getSchoolUserOrFail = (req: Request, res: Response) => {
  const user = req.user;
  if (!user?.schoolId || !user.userId) {
    res.status(403).json({ error: 'School context not found' });
    return null;
  }
  return user as Required<Pick<AuthTokenPayload, 'userId' | 'schoolId'>> & AuthTokenPayload;
};

// -----------------------------------------
// PUBLIC ROUTES
// -----------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DriveFlow API is running' });
});

app.post('/api/super-admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let superAdmin = null;
    try {
      superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
    } catch (error) {
      superAdmin = null;
    }

    if (superAdmin && superAdmin.status === UserStatus.ACTIVE) {
      const ok = await bcrypt.compare(password, superAdmin.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { role: 'SUPER_ADMIN', superAdminId: superAdmin.id, email: superAdmin.email } as AuthTokenPayload,
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({
        token,
        superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email }
      });
    }

    // Fallback env-based super admin (useful when DB table is not yet migrated)
    const envEmail = process.env.SUPER_ADMIN_EMAIL;
    const envPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (envEmail && envPassword && envEmail === email && envPassword === password) {
      const token = jwt.sign(
        { role: 'SUPER_ADMIN', superAdminId: 'env-super-admin', email } as AuthTokenPayload,
        JWT_SECRET,
        { expiresIn: '12h' }
      );
      return res.json({
        token,
        superAdmin: { id: 'env-super-admin', name: 'Super Admin', email }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error: any) {
    res.status(500).json({ error: 'Super admin login failed', details: error.message });
  }
});

app.post('/api/super-admin/schools', authenticateToken, requireRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const {
      schoolName,
      schoolOwnerName,
      schoolMobileNumber,
      schoolEmail,
      ownerEmail,
      ownerMobile,
      schoolLocation,
      password,
      location,
      city,
      pincode
    } = req.body;

    if (!schoolName || !schoolOwnerName || !ownerEmail || !password) {
      return res.status(400).json({
        error: 'schoolName, schoolOwnerName, ownerEmail and password are required'
      });
    }

    const existingAdmin = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Owner email already exists as a user' });
    }

    const [firstName, ...lastParts] = String(schoolOwnerName).trim().split(' ');
    const lastName = lastParts.join(' ') || 'Owner';
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          contactEmail: schoolEmail || ownerEmail,
          mobile: schoolMobileNumber || null,
          ownerName: schoolOwnerName,
          ownerEmail: ownerEmail,
          ownerMobile: ownerMobile || null,
          location: schoolLocation || location || null,
          city: city || null,
          pincode: pincode || null
        }
      });

      const adminUser = await tx.user.create({
        data: {
          schoolId: school.id,
          email: ownerEmail,
          passwordHash,
          role: Role.ADMIN,
          firstName: firstName || 'School',
          lastName,
          phone: ownerMobile || null,
          location: schoolLocation || location || null
        }
      });

      return { school, adminUser };
    });

    res.status(201).json({
      message: 'Driving school created successfully',
      school: result.school,
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        role: result.adminUser.role,
        schoolId: result.adminUser.schoolId
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create driving school', details: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { mobile, email, role, password, confirmPassword } = req.body;

    if (!mobile || !email || !role || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['ADMIN', 'STUDENT', 'TRAINER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and confirm password do not match' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        phone: mobile,
        role: role as Role
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'No account matched the provided details' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, status: UserStatus.ACTIVE }
    });

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset password', details: error.message });
  }
});

// Seed: creates school + admin + trainer + student accounts
app.post('/api/setup', async (req, res) => {
  try {
    const existing = await prisma.school.findFirst();
    if (existing) {
      return res.json({ message: 'Setup already complete. Use the existing credentials to log in.' });
    }

    const school = await prisma.school.create({
      data: { name: 'DriveFlow Academy', contactEmail: 'admin@driveflow.com' }
    });

    const [adminHash, trainerHash, studentHash] = await Promise.all([
      bcrypt.hash('Admin@123', 10),
      bcrypt.hash('Trainer@123', 10),
      bcrypt.hash('Student@123', 10)
    ]);

    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: 'admin@driveflow.com',
        passwordHash: adminHash,
        role: Role.ADMIN,
        firstName: 'Super',
        lastName: 'Admin'
      }
    });

    const trainerUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: 'trainer@driveflow.com',
        passwordHash: trainerHash,
        role: Role.TRAINER,
        firstName: 'John',
        lastName: 'Smith'
      }
    });
    await prisma.trainerProfile.create({ data: { userId: trainerUser.id } });

    const studentUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: 'student@driveflow.com',
        passwordHash: studentHash,
        role: Role.STUDENT,
        firstName: 'Jane',
        lastName: 'Doe'
      }
    });
    const studentProfile = await prisma.studentProfile.create({ data: { userId: studentUser.id } });

    const course = await prisma.course.create({
      data: {
        schoolId: school.id,
        title: 'Defensive Driving Module 1',
        description: 'Complete defensive driving course for beginners',
        durationDays: 30,
        price: 500
      }
    });

    const test = await prisma.mockTest.create({
      data: {
        schoolId: school.id,
        title: 'Traffic Signs & Signals',
        description: 'Test your knowledge of road signs and traffic signals.',
        passingScore: 70,
        timeLimitMinutes: 30
      }
    });

    const sampleQuestions = [
      {
        text: 'What does a red traffic light mean?',
        options: JSON.stringify(['Go', 'Stop', 'Slow down', 'Yield']),
        correctAnswer: 'Stop'
      },
      {
        text: 'What does a yellow traffic light mean?',
        options: JSON.stringify(['Go faster', 'Stop immediately', 'Prepare to stop', 'Yield to pedestrians']),
        correctAnswer: 'Prepare to stop'
      },
      {
        text: 'What is the meaning of a solid white line on the road?',
        options: JSON.stringify(['You may cross it', 'Do not cross it', 'End of road', 'Parking zone']),
        correctAnswer: 'Do not cross it'
      },
      {
        text: 'When should you use your hazard lights?',
        options: JSON.stringify(['When driving fast', 'When parked illegally', 'When your vehicle is stopped in an emergency', 'When overtaking']),
        correctAnswer: 'When your vehicle is stopped in an emergency'
      },
      {
        text: 'What is the speed limit in a school zone unless otherwise posted?',
        options: JSON.stringify(['15 mph', '25 mph', '35 mph', '45 mph']),
        correctAnswer: '25 mph'
      }
    ];

    for (const q of sampleQuestions) {
      await prisma.question.create({ data: { testId: test.id, ...q } });
    }

    const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: trainerUser.id } });
    if (trainerProfile) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(10, 0, 0, 0);

      await prisma.classSchedule.create({
        data: {
          schoolId: school.id,
          courseId: course.id,
          trainerId: trainerProfile.id,
          studentId: studentProfile.id,
          startTime: nextWeek,
          endTime: null
        }
      });
    }

    await prisma.payment.create({
      data: {
        schoolId: school.id,
        studentId: studentProfile.id,
        amount: 250,
        method: 'BANK_TRANSFER',
        status: 'PAID',
        notes: 'First installment'
      }
    });

    res.json({
      message: 'Setup complete! You can now login with these credentials:',
      credentials: {
        admin: { email: 'admin@driveflow.com', password: 'Admin@123' },
        trainer: { email: 'trainer@driveflow.com', password: 'Trainer@123' },
        student: { email: 'student@driveflow.com', password: 'Student@123' }
      }
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!user || user.status === UserStatus.LOCKED) {
      return res.status(401).json({ error: 'Invalid credentials or account locked' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, schoolId: user.schoolId } as AuthTokenPayload,
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolName: user.school?.name,
        schoolId: user.schoolId
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// -----------------------------------------
// PROTECTED ROUTES
// -----------------------------------------

app.use('/api', authenticateToken);

app.get('/api/users', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;

    if (authUser.role === 'ADMIN') {
      const users = await prisma.user.findMany({
        where: { schoolId: authUser.schoolId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          phone: true,
          location: true,
          dateOfBirth: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(users);
    }

    if (authUser.role === 'TRAINER') {
      const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: authUser.userId } });
      if (!trainerProfile) return res.json([]);

      const schedules = await prisma.classSchedule.findMany({
        where: { schoolId: authUser.schoolId, trainerId: trainerProfile.id, studentId: { not: null } },
        select: { studentId: true },
        distinct: ['studentId']
      });

      const studentIds = schedules.map((s) => s.studentId).filter((v): v is string => Boolean(v));
      if (studentIds.length === 0) return res.json([]);

      const profiles = await prisma.studentProfile.findMany({
        where: { id: { in: studentIds } },
        include: { user: true }
      });

      const users = profiles.map((p) => ({
        id: p.user.id,
        email: p.user.email,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        role: p.user.role,
        status: p.user.status,
        phone: p.user.phone,
        location: p.user.location,
        dateOfBirth: p.user.dateOfBirth,
        createdAt: p.user.createdAt
      }));

      return res.json(users);
    }

    const self = await prisma.user.findFirst({
      where: { id: authUser.userId, schoolId: authUser.schoolId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
        location: true,
        dateOfBirth: true,
        createdAt: true
      }
    });
    res.json(self ? [self] : []);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

app.post('/api/users', requireRoles('ADMIN'), upload.array('documents', 4), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;

    const { email, password, firstName, lastName, role, phone, location, dateOfBirth } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        schoolId: authUser.schoolId,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role,
        phone,
        location,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
      }
    });

    if (role === 'STUDENT') {
      await prisma.studentProfile.create({ data: { userId: user.id } });
    } else if (role === 'TRAINER') {
      await prisma.trainerProfile.create({ data: { userId: user.id } });
    }

    if (req.files && Array.isArray(req.files)) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const remark = req.body[`remark_${i}`] || null;

        await prisma.document.create({
          data: {
            userId: user.id,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            fileUrl: `/uploads/${file.filename}`,
            remark
          }
        });
      }
    }

    res.status(201).json({ message: 'User created successfully', user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

app.put('/api/users/:id', requireRoles('ADMIN'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;
    const targetUserId = String(req.params.id);

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, schoolId: authUser.schoolId }
    });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const { firstName, lastName, email, phone, location, dateOfBirth, status, password } = req.body;
    const data: any = {};
    if (typeof firstName === 'string') data.firstName = firstName;
    if (typeof lastName === 'string') data.lastName = lastName;
    if (typeof email === 'string') data.email = email;
    if (typeof phone === 'string') data.phone = phone;
    if (typeof location === 'string') data.location = location;
    if (typeof status === 'string' && ['ACTIVE', 'LOCKED'].includes(status)) data.status = status;
    if (dateOfBirth) data.dateOfBirth = new Date(dateOfBirth);
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
        location: true,
        dateOfBirth: true,
        createdAt: true
      }
    });

    res.json({ message: 'User updated', user: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

app.get('/api/users/:id/documents', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;
    const targetUserId = String(req.params.id);

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, schoolId: authUser.schoolId }
    });
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (authUser.role === 'STUDENT' && authUser.userId !== target.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const documents = await prisma.document.findMany({
      where: { userId: target.id }
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

app.patch('/api/users/:id/status', requireRoles('ADMIN'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;
    const targetUserId = String(req.params.id);

    const { status } = req.body;
    if (!['ACTIVE', 'LOCKED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, schoolId: authUser.schoolId }
    });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const user = await prisma.user.update({
      where: { id: target.id },
      data: { status }
    });
    res.json({ message: 'Status updated', user: { id: user.id, status: user.status } });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user status', details: error.message });
  }
});

const deleteUserById = async (schoolId: string, targetUserId: string, actingUserId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, schoolId }
  });
  if (!user) return { status: 404, body: { error: 'User not found' } };
  if (user.id === actingUserId) return { status: 400, body: { error: 'You cannot delete your own account' } };

  if (user.role === Role.TRAINER) {
    const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: user.id } });
    if (trainerProfile) {
      const activeScheduleCount = await prisma.classSchedule.count({
        where: { trainerId: trainerProfile.id, schoolId, status: { not: 'CANCELLED' } }
      });
      if (activeScheduleCount > 0) {
        return {
          status: 400,
          body: { error: 'Trainer has assigned schedules. Reassign or delete schedules before deleting trainer.' }
        };
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.document.deleteMany({ where: { userId: user.id } });

    if (user.role === Role.STUDENT) {
      const studentProfile = await tx.studentProfile.findUnique({ where: { userId: user.id } });
      if (studentProfile) {
        await tx.attendance.deleteMany({ where: { studentId: studentProfile.id } });
        await tx.payment.deleteMany({ where: { studentId: studentProfile.id } });
        await tx.testResult.deleteMany({ where: { studentId: studentProfile.id } });
        await tx.classSchedule.updateMany({
          where: { studentId: studentProfile.id },
          data: { studentId: null }
        });
        await tx.studentProfile.delete({ where: { id: studentProfile.id } });
      }
    }

    if (user.role === Role.TRAINER) {
      const trainerProfile = await tx.trainerProfile.findUnique({ where: { userId: user.id } });
      if (trainerProfile) {
        await tx.trainerProfile.delete({ where: { id: trainerProfile.id } });
      }
    }

    await tx.user.delete({ where: { id: user.id } });
  });

  return { status: 200, body: { message: 'User deleted successfully', deletedUserId: user.id } };
};

app.delete('/api/users/:id', requireRoles('ADMIN'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;
    const targetUserId = String(req.params.id);

    const result = await deleteUserById(authUser.schoolId, targetUserId, authUser.userId);
    res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Fallback for hosting environments that block DELETE at edge level.
app.post('/api/users/:id/delete', requireRoles('ADMIN'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;
    const targetUserId = String(req.params.id);

    const result = await deleteUserById(authUser.schoolId, targetUserId, authUser.userId);
    res.status(result.status).json(result.body);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

app.get('/api/attendance', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;

    if (authUser.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } });
      if (!studentProfile) return res.json([]);

      const attendances = await prisma.attendance.findMany({
        where: { studentId: studentProfile.id },
        include: {
          schedule: {
            include: {
              course: true,
              trainer: { include: { user: true } },
              student: { include: { user: true } }
            }
          }
        },
        orderBy: { schedule: { startTime: 'desc' } }
      });
      return res.json(attendances);
    }

    if (authUser.role === 'TRAINER') {
      const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: authUser.userId } });
      if (!trainerProfile) return res.json([]);

      const attendances = await prisma.attendance.findMany({
        where: {
          schedule: {
            schoolId: authUser.schoolId,
            trainerId: trainerProfile.id
          }
        },
        include: {
          student: { include: { user: true } },
          schedule: { include: { course: true, student: { include: { user: true } } } }
        },
        orderBy: { schedule: { startTime: 'desc' } }
      });
      return res.json(attendances);
    }

    const attendances = await prisma.attendance.findMany({
      where: { schedule: { schoolId: authUser.schoolId } },
      include: {
        student: { include: { user: true } },
        schedule: {
          include: {
            course: true,
            trainer: { include: { user: true } },
            student: { include: { user: true } }
          }
        }
      },
      orderBy: { schedule: { startTime: 'desc' } }
    });
    res.json(attendances);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
});

app.get('/api/profile', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
  try {
    const authUser = getSchoolUserOrFail(req, res);
    if (!authUser) return;

    if (authUser.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: authUser.userId },
        include: {
          payments: true,
          testResults: { include: { test: true } },
          attendances: {
            include: {
              schedule: {
                include: {
                  course: true,
                  trainer: { include: { user: true } },
                  student: { include: { user: true } }
                }
              }
            }
          }
        }
      });
      return res.json(profile);
    }

    if (authUser.role === 'TRAINER') {
      const profile = await prisma.trainerProfile.findUnique({
        where: { userId: authUser.userId },
        include: {
          classes: {
            include: {
              course: true,
              student: { include: { user: true } },
              attendances: { include: { student: { include: { user: true } } } }
            }
          }
        }
      });
      return res.json(profile);
    }

    res.json({ role: 'ADMIN' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

app.use('/api/schedules', scheduleRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/mock-tests', mockTestRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
