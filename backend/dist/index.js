"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const payments_1 = __importDefault(require("./routes/payments"));
const mockTests_1 = __importDefault(require("./routes/mockTests"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'driveflow-secret-2024';
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../frontend/dist')));
}
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
// Configure Multer
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 1024 * 1024 } // 1MB limit
});
// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Access denied' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ error: 'Invalid token' });
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
// Seed: creates school + admin + trainer + student accounts
app.post('/api/setup', async (req, res) => {
    try {
        // Check if already set up
        const existing = await prisma.school.findFirst();
        if (existing) {
            return res.json({ message: 'Setup already complete. Use the existing credentials to log in.' });
        }
        const school = await prisma.school.create({
            data: { name: 'DriveFlow Academy', contactEmail: 'admin@driveflow.com' }
        });
        const [adminHash, trainerHash, studentHash] = await Promise.all([
            bcrypt_1.default.hash('Admin@123', 10),
            bcrypt_1.default.hash('Trainer@123', 10),
            bcrypt_1.default.hash('Student@123', 10)
        ]);
        // Create admin
        await prisma.user.create({
            data: {
                schoolId: school.id,
                email: 'admin@driveflow.com',
                passwordHash: adminHash,
                role: 'ADMIN',
                firstName: 'Super',
                lastName: 'Admin'
            }
        });
        // Create trainer
        const trainerUser = await prisma.user.create({
            data: {
                schoolId: school.id,
                email: 'trainer@driveflow.com',
                passwordHash: trainerHash,
                role: 'TRAINER',
                firstName: 'John',
                lastName: 'Smith'
            }
        });
        await prisma.trainerProfile.create({ data: { userId: trainerUser.id } });
        // Create student
        const studentUser = await prisma.user.create({
            data: {
                schoolId: school.id,
                email: 'student@driveflow.com',
                passwordHash: studentHash,
                role: 'STUDENT',
                firstName: 'Jane',
                lastName: 'Doe'
            }
        });
        await prisma.studentProfile.create({ data: { userId: studentUser.id } });
        // Create default course
        const course = await prisma.course.create({
            data: {
                schoolId: school.id,
                title: 'Defensive Driving Module 1',
                description: 'Complete defensive driving course for beginners',
                durationDays: 30,
                price: 500
            }
        });
        // Create a sample mock test with questions
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
        // Sample schedule
        const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: trainerUser.id } });
        if (trainerProfile) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(10, 0, 0, 0);
            const nextWeekEnd = new Date(nextWeek);
            nextWeekEnd.setHours(11, 30, 0, 0);
            await prisma.classSchedule.create({
                data: {
                    schoolId: school.id,
                    courseId: course.id,
                    trainerId: trainerProfile.id,
                    startTime: nextWeek,
                    endTime: nextWeekEnd
                }
            });
        }
        // Sample payment for student
        const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: studentUser.id } });
        if (studentProfile) {
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
        }
        res.json({
            message: 'Setup complete! You can now login with these credentials:',
            credentials: {
                admin: { email: 'admin@driveflow.com', password: 'Admin@123' },
                trainer: { email: 'trainer@driveflow.com', password: 'Trainer@123' },
                student: { email: 'student@driveflow.com', password: 'Student@123' }
            }
        });
    }
    catch (error) {
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
        if (!user || user.status === 'LOCKED') {
            return res.status(401).json({ error: 'Invalid credentials or account locked' });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, schoolId: user.schoolId }, JWT_SECRET, { expiresIn: '7d' });
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
    }
    catch (error) {
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
            select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, phone: true, location: true, dateOfBirth: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
app.post('/api/users', upload.array('documents', 4), async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, phone, location, dateOfBirth } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                schoolId: req.user.schoolId,
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
        // Create profile based on role
        if (role === 'STUDENT') {
            await prisma.studentProfile.create({ data: { userId: user.id } });
        }
        else if (role === 'TRAINER') {
            await prisma.trainerProfile.create({ data: { userId: user.id } });
        }
        // Process documents
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
        res.json({ message: 'User created successfully', user: { id: user.id, email: user.email } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
});
// Get user documents
app.get('/api/users/:id/documents', async (req, res) => {
    try {
        const documents = await prisma.document.findMany({
            where: { userId: req.params.id }
        });
        res.json(documents);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user status' });
    }
});
// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (user?.role === 'STUDENT')
            await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
        if (user?.role === 'TRAINER')
            await prisma.trainerProfile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted' });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// Get current user's own profile (for student/trainer dashboard)
app.get('/api/profile', async (req, res) => {
    try {
        if (req.user.role === 'STUDENT') {
            const profile = await prisma.studentProfile.findUnique({
                where: { userId: req.user.userId },
                include: {
                    payments: true,
                    testResults: { include: { test: true } },
                    attendances: { include: { schedule: { include: { course: true, trainer: { include: { user: true } } } } } }
                }
            });
            res.json(profile);
        }
        else if (req.user.role === 'TRAINER') {
            const profile = await prisma.trainerProfile.findUnique({
                where: { userId: req.user.userId },
                include: {
                    classes: {
                        include: {
                            course: true,
                            attendances: { include: { student: { include: { user: true } } } }
                        }
                    }
                }
            });
            res.json(profile);
        }
        else {
            res.json({ role: 'ADMIN' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    }
});
app.use('/api/schedules', schedule_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/mock-tests', mockTests_1.default);
// Catch-all for React router in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../frontend/dist/index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
