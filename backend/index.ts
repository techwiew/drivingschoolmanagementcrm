import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import scheduleRouter from './routes/schedule';
import paymentRouter from './routes/payments';
import mockTestRouter from './routes/mockTests';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors());
app.use(express.json());

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Authentication Middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// -----------------------------------------
// PUBLIC ROUTES
// -----------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DriveFlow API is running' });
});

app.post('/api/setup', async (req, res) => {
  try {
    const school = await prisma.school.create({
      data: {
        name: 'DriveFlow Academy',
        contactEmail: 'admin@driveflow.com'
      }
    });

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: 'admin@driveflow.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        firstName: 'Super',
        lastName: 'Admin'
      }
    });

    res.json({ message: 'Setup complete', admin });
  } catch (error: any) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed', details: error.message });
  }
});


  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!user || user.status === 'LOCKED') {
      return res.status(401).json({ error: 'Invalid credentials or account locked' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, schoolId: user.schoolId },
      JWT_SECRET,
      { expiresIn: '1d' }
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

// === USERS API ===

// Get all users in the school
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId: req.user.schoolId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user (Student/Trainer)
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        schoolId: req.user.schoolId,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role
      }
    });

    // Create profile based on role
    if (role === 'STUDENT') {
      await prisma.studentProfile.create({ data: { userId: user.id } });
    } else if (role === 'TRAINER') {
      await prisma.trainerProfile.create({ data: { userId: user.id } });
    }

    res.json({ message: 'User created successfully', user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user status (Lock/Unlock)
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ message: 'Status updated', user: { id: user.id, status: user.status } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    // Delete profile first due to constraints
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (user?.role === 'STUDENT') await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
    if (user?.role === 'TRAINER') await prisma.trainerProfile.deleteMany({ where: { userId: user.id } });
    
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.use('/api/schedules', scheduleRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/mock-tests', mockTestRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
