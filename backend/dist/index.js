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
const corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
};
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Handle Vercel-style routing locally and on cPanel
app.use((req, res, next) => {
    if (req.url.startsWith('/_/backend/api')) {
        req.url = req.url.replace('/_/backend/api', '/api');
    }
    next();
});
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
    limits: { fileSize: 1024 * 1024 }
});
const authenticateToken = (req, res, next) => {
    if (req.method === 'OPTIONS')
        return res.sendStatus(204);
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Access denied' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
        if (err)
            return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
const getSchoolUserOrFail = (req, res) => {
    const user = req.user;
    if (!user?.schoolId || !user.userId) {
        res.status(403).json({ error: 'School context not found' });
        return null;
    }
    return user;
};
const minimumAdultDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    date.setHours(23, 59, 59, 999);
    return date;
};
const parseAdultDateOfBirth = (value) => {
    if (!value) {
        return { ok: false, error: 'Date of birth is required.' };
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: 'Date of birth is invalid.' };
    }
    if (parsed > minimumAdultDate()) {
        return { ok: false, error: 'User must be at least 18 years old.' };
    }
    return { ok: true, value: parsed };
};
const parseOptionalDate = (value, fieldLabel) => {
    if (value === undefined || value === null || value === '') {
        return { ok: true, value: null };
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: `${fieldLabel} is invalid.` };
    }
    return { ok: true, value: parsed };
};
const normalizeTenDigitMobile = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(digits)) {
        return { ok: false, error: 'Mobile number must be exactly 10 digits.' };
    }
    return { ok: true, value: digits };
};
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth)
        return null;
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const hasBirthdayPassed = today.getMonth() > dateOfBirth.getMonth() ||
        (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());
    if (!hasBirthdayPassed)
        age -= 1;
    return age;
};
// -----------------------------------------
// PUBLIC ROUTES
// -----------------------------------------
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'drivingsync API is running' });
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
        }
        catch (error) {
            superAdmin = null;
        }
        if (superAdmin && superAdmin.status === client_1.UserStatus.ACTIVE) {
            const ok = await bcrypt_1.default.compare(password, superAdmin.passwordHash);
            if (!ok)
                return res.status(401).json({ error: 'Invalid credentials' });
            const token = jsonwebtoken_1.default.sign({ role: 'SUPER_ADMIN', superAdminId: superAdmin.id, email: superAdmin.email }, JWT_SECRET, { expiresIn: '12h' });
            return res.json({
                token,
                superAdmin: { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email }
            });
        }
        // Fallback env-based super admin (useful when DB table is not yet migrated)
        const envEmail = process.env.SUPER_ADMIN_EMAIL;
        const envPassword = process.env.SUPER_ADMIN_PASSWORD;
        if (envEmail && envPassword && envEmail === email && envPassword === password) {
            const token = jsonwebtoken_1.default.sign({ role: 'SUPER_ADMIN', superAdminId: 'env-super-admin', email }, JWT_SECRET, { expiresIn: '12h' });
            return res.json({
                token,
                superAdmin: { id: 'env-super-admin', name: 'Super Admin', email }
            });
        }
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    catch (error) {
        res.status(500).json({ error: 'Super admin login failed', details: error.message });
    }
});
app.post('/api/super-admin/schools', authenticateToken, requireRoles('SUPER_ADMIN'), async (req, res) => {
    try {
        const { schoolName, schoolOwnerName, schoolMobileNumber, schoolEmail, ownerEmail, ownerMobile, schoolLocation, password, location, city, pincode } = req.body;
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
        const passwordHash = await bcrypt_1.default.hash(password, 10);
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
                    role: client_1.Role.ADMIN,
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
    }
    catch (error) {
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
                role: role
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'No account matched the provided details' });
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, status: client_1.UserStatus.ACTIVE }
        });
        res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    }
    catch (error) {
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
            data: { name: 'drivingsync Academy', contactEmail: 'admin@drivingsync.com' }
        });
        const [adminHash, trainerHash, studentHash] = await Promise.all([
            bcrypt_1.default.hash('Admin@123', 10),
            bcrypt_1.default.hash('Trainer@123', 10),
            bcrypt_1.default.hash('Student@123', 10)
        ]);
        await prisma.user.create({
            data: {
                schoolId: school.id,
                email: 'admin@drivingsync.com',
                passwordHash: adminHash,
                role: client_1.Role.ADMIN,
                firstName: 'Super',
                lastName: 'Admin'
            }
        });
        const trainerUser = await prisma.user.create({
            data: {
                schoolId: school.id,
                email: 'trainer@drivingsync.com',
                passwordHash: trainerHash,
                role: client_1.Role.TRAINER,
                firstName: 'John',
                lastName: 'Smith'
            }
        });
        await prisma.trainerProfile.create({ data: { userId: trainerUser.id } });
        const studentUser = await prisma.user.create({
            data: {
                schoolId: school.id,
                email: 'student@drivingsync.com',
                passwordHash: studentHash,
                role: client_1.Role.STUDENT,
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
                admin: { email: 'admin@drivingsync.com', password: 'Admin@123' },
                trainer: { email: 'trainer@drivingsync.com', password: 'Trainer@123' },
                student: { email: 'student@drivingsync.com', password: 'Student@123' }
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
        if (!user || user.status === client_1.UserStatus.LOCKED) {
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
app.get('/api/users', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
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
                    admissionDate: true,
                    classType: true,
                    joiningDate: true,
                    createdAt: true,
                    studentProfile: true
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(users);
        }
        if (authUser.role === 'TRAINER') {
            const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId: authUser.userId } });
            if (!trainerProfile)
                return res.json([]);
            const schedules = await prisma.classSchedule.findMany({
                where: { schoolId: authUser.schoolId, trainerId: trainerProfile.id, studentId: { not: null } },
                select: { studentId: true },
                distinct: ['studentId']
            });
            const studentIds = schedules.map((s) => s.studentId).filter((v) => Boolean(v));
            if (studentIds.length === 0)
                return res.json([]);
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
                admissionDate: p.user.admissionDate,
                classType: p.user.classType,
                joiningDate: p.user.joiningDate,
                createdAt: p.user.createdAt,
                studentProfile: {
                    id: p.id,
                    licenseStatus: p.licenseStatus,
                    totalPaid: p.totalPaid,
                    balanceDue: p.balanceDue
                }
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
                admissionDate: true,
                classType: true,
                joiningDate: true,
                createdAt: true,
                studentProfile: true
            }
        });
        res.json(self ? [self] : []);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});
app.post('/api/users', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const { email, password, firstName, lastName, role, phone, location, dateOfBirth, totalAmount, admissionDate, classType, joiningDate } = req.body;
        if (!email || !password || !firstName || !lastName || !role || !phone || !location || !dateOfBirth || !admissionDate) {
            return res.status(400).json({ error: 'Cannot create user because required fields are missing.' });
        }
        if (role === 'ADMIN') {
            return res.status(403).json({ error: 'Cannot create admin users from the admin panel.' });
        }
        if (!['STUDENT', 'TRAINER'].includes(role)) {
            return res.status(400).json({ error: 'Cannot create user because the selected role is invalid.' });
        }
        const parsedPhone = normalizeTenDigitMobile(phone);
        if (!parsedPhone.ok) {
            return res.status(400).json({ error: parsedPhone.error });
        }
        const parsedDob = parseAdultDateOfBirth(dateOfBirth);
        if (!parsedDob.ok) {
            return res.status(400).json({ error: parsedDob.error });
        }
        const parsedAdmissionDate = parseOptionalDate(admissionDate, 'Admission date');
        if (!parsedAdmissionDate.ok || !parsedAdmissionDate.value) {
            return res.status(400).json({ error: parsedAdmissionDate.ok ? 'Admission date is required.' : parsedAdmissionDate.error });
        }
        const parsedJoiningDate = parseOptionalDate(joiningDate, 'Joining date');
        if (!parsedJoiningDate.ok) {
            return res.status(400).json({ error: parsedJoiningDate.error });
        }
        const parsedTotalAmount = totalAmount === '' || totalAmount === undefined ? 0 : Number(totalAmount);
        if (role === 'STUDENT' && (!Number.isFinite(parsedTotalAmount) || parsedTotalAmount < 0)) {
            return res.status(400).json({ error: 'Cannot create student because the total payment amount is invalid.' });
        }
        if (role === 'TRAINER' && !parsedJoiningDate.value) {
            return res.status(400).json({ error: 'Joining date is required for trainer.' });
        }
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Cannot create user because the email is already registered.' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    schoolId: authUser.schoolId,
                    email,
                    passwordHash: hashedPassword,
                    firstName,
                    lastName,
                    role,
                    phone: parsedPhone.value,
                    location,
                    dateOfBirth: parsedDob.value,
                    admissionDate: parsedAdmissionDate.value,
                    classType: typeof classType === 'string' ? classType.trim() || null : null,
                    joiningDate: role === 'TRAINER' ? parsedJoiningDate.value : null
                }
            });
            if (role === 'STUDENT') {
                await tx.studentProfile.create({
                    data: {
                        userId: createdUser.id,
                        totalPaid: 0,
                        balanceDue: parsedTotalAmount
                    }
                });
            }
            else if (role === 'TRAINER') {
                await tx.trainerProfile.create({ data: { userId: createdUser.id } });
            }
            return createdUser;
        });
        res.status(201).json({
            message: `${user.firstName} ${user.lastName} (${user.role}) was added successfully.`,
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
        });
    }
    catch (error) {
        if (error?.code === 'P2002' && Array.isArray(error?.meta?.target) && error.meta.target.includes('email')) {
            return res.status(409).json({ error: 'Cannot create user because the email is already registered.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
});
const updateUserById = async (schoolId, targetUserId, payload) => {
    const target = await prisma.user.findFirst({
        where: { id: targetUserId, schoolId }
    });
    if (!target)
        return { status: 404, body: { error: 'User not found' } };
    const { firstName, lastName, email, phone, location, dateOfBirth, status, password, admissionDate, classType, joiningDate } = payload || {};
    const data = {};
    if (typeof firstName === 'string')
        data.firstName = firstName;
    if (typeof lastName === 'string')
        data.lastName = lastName;
    if (typeof email === 'string')
        data.email = email;
    if (typeof phone === 'string') {
        const incomingPhone = phone.trim();
        const existingPhone = (target.phone || '').trim();
        // Keep legacy values untouched when phone wasn't edited, so date-only edits don't fail.
        if (incomingPhone === existingPhone) {
            data.phone = target.phone;
        }
        else if (incomingPhone === '') {
            data.phone = null;
        }
        else {
            const parsedPhone = normalizeTenDigitMobile(incomingPhone);
            if (!parsedPhone.ok) {
                return { status: 400, body: { error: parsedPhone.error } };
            }
            data.phone = parsedPhone.value;
        }
    }
    if (typeof location === 'string')
        data.location = location;
    if (typeof status === 'string' && ['ACTIVE', 'LOCKED'].includes(status))
        data.status = status;
    if (dateOfBirth) {
        const parsedDob = parseAdultDateOfBirth(dateOfBirth);
        if (!parsedDob.ok) {
            return { status: 400, body: { error: parsedDob.error } };
        }
        data.dateOfBirth = parsedDob.value;
    }
    if (admissionDate !== undefined) {
        const parsedAdmissionDate = parseOptionalDate(admissionDate, 'Admission date');
        if (!parsedAdmissionDate.ok) {
            return { status: 400, body: { error: parsedAdmissionDate.error } };
        }
        data.admissionDate = parsedAdmissionDate.value;
    }
    if (classType !== undefined) {
        data.classType = typeof classType === 'string' ? classType.trim() || null : null;
    }
    if (joiningDate !== undefined) {
        const parsedJoiningDate = parseOptionalDate(joiningDate, 'Joining date');
        if (!parsedJoiningDate.ok) {
            return { status: 400, body: { error: parsedJoiningDate.error } };
        }
        data.joiningDate = parsedJoiningDate.value;
    }
    if (password)
        data.passwordHash = await bcrypt_1.default.hash(password, 10);
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
            admissionDate: true,
            classType: true,
            joiningDate: true,
            createdAt: true
        }
    });
    return { status: 200, body: { message: 'User updated', user: updated } };
};
app.put('/api/users/:id', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const result = await updateUserById(authUser.schoolId, String(req.params.id), req.body);
        res.status(result.status).json(result.body);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
});
// Fallback for hosting environments that block PUT at edge level.
app.post('/api/users/:id/update', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const result = await updateUserById(authUser.schoolId, String(req.params.id), req.body);
        res.status(result.status).json(result.body);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
});
app.get('/api/users/:id/details', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const targetUserId = String(req.params.id);
        const target = await prisma.user.findFirst({
            where: { id: targetUserId, schoolId: authUser.schoolId },
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
                admissionDate: true,
                classType: true,
                joiningDate: true,
                createdAt: true
            }
        });
        if (!target)
            return res.status(404).json({ error: 'User not found' });
        const documents = await prisma.document.findMany({
            where: { userId: target.id },
            orderBy: { uploadedAt: 'desc' }
        });
        if (target.role === client_1.Role.STUDENT) {
            const studentProfile = await prisma.studentProfile.findUnique({
                where: { userId: target.id }
            });
            if (!studentProfile) {
                return res.json({ ...target, documents, summary: null, studentProfile: null, payments: [], schedules: [], attendances: [], testResults: [] });
            }
            const [payments, schedules, attendances, testResults] = await Promise.all([
                prisma.payment.findMany({
                    where: { schoolId: authUser.schoolId, studentId: studentProfile.id },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.classSchedule.findMany({
                    where: { schoolId: authUser.schoolId, studentId: studentProfile.id },
                    include: {
                        course: true,
                        trainer: { include: { user: true } }
                    },
                    orderBy: { startTime: 'desc' }
                }),
                prisma.attendance.findMany({
                    where: {
                        studentId: studentProfile.id,
                        schedule: { schoolId: authUser.schoolId }
                    },
                    include: {
                        schedule: {
                            include: {
                                course: true,
                                trainer: { include: { user: true } }
                            }
                        }
                    },
                    orderBy: { schedule: { startTime: 'desc' } }
                }),
                prisma.testResult.findMany({
                    where: { studentId: studentProfile.id },
                    include: { test: true },
                    orderBy: { attemptedAt: 'desc' }
                })
            ]);
            const totalPaidFromPayments = payments
                .filter((payment) => payment.status === 'PAID')
                .reduce((sum, payment) => sum + payment.amount, 0);
            const totalFees = Math.max(studentProfile.totalPaid + studentProfile.balanceDue, totalPaidFromPayments);
            const firstJoinedClassAt = schedules.length > 0
                ? schedules.reduce((earliest, schedule) => new Date(schedule.startTime) < new Date(earliest.startTime) ? schedule : earliest).startTime
                : null;
            const latestPaymentAt = payments.length > 0 ? payments[0].createdAt : null;
            return res.json({
                ...target,
                documents,
                studentProfile,
                payments,
                schedules,
                attendances,
                testResults,
                summary: {
                    totalFees,
                    totalPaid: studentProfile.totalPaid ?? totalPaidFromPayments,
                    balanceDue: studentProfile.balanceDue ?? 0,
                    joinedOn: target.admissionDate || target.createdAt,
                    age: calculateAge(target.dateOfBirth),
                    firstJoinedClassAt,
                    latestPaymentAt,
                    totalClasses: schedules.length,
                    completedClasses: schedules.filter((schedule) => schedule.status === 'COMPLETED').length,
                    upcomingClasses: schedules.filter((schedule) => schedule.status === 'SCHEDULED').length,
                    totalDocuments: documents.length
                }
            });
        }
        if (target.role === client_1.Role.TRAINER) {
            const trainerProfile = await prisma.trainerProfile.findUnique({
                where: { userId: target.id }
            });
            if (!trainerProfile) {
                return res.json({ ...target, documents, summary: null, trainerProfile: null, schedules: [] });
            }
            const schedules = await prisma.classSchedule.findMany({
                where: { schoolId: authUser.schoolId, trainerId: trainerProfile.id },
                include: {
                    course: true,
                    student: { include: { user: true } },
                    attendances: { include: { student: { include: { user: true } } } }
                },
                orderBy: { startTime: 'desc' }
            });
            return res.json({
                ...target,
                documents,
                trainerProfile,
                schedules,
                summary: {
                    totalClasses: schedules.length,
                    completedClasses: schedules.filter((schedule) => schedule.status === 'COMPLETED').length,
                    upcomingClasses: schedules.filter((schedule) => schedule.status === 'SCHEDULED').length,
                    assignedStudents: new Set(schedules.map((schedule) => schedule.student?.userId).filter((studentId) => Boolean(studentId))).size,
                    totalDocuments: documents.length
                }
            });
        }
        return res.json({
            ...target,
            documents,
            summary: {
                totalDocuments: documents.length
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user details', details: error.message });
    }
});
app.get('/api/users/:id/documents', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const targetUserId = String(req.params.id);
        const target = await prisma.user.findFirst({
            where: { id: targetUserId, schoolId: authUser.schoolId }
        });
        if (!target)
            return res.status(404).json({ error: 'User not found' });
        if (authUser.role === 'STUDENT' && authUser.userId !== target.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const documents = await prisma.document.findMany({
            where: { userId: target.id }
        });
        res.json(documents);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
    }
});
app.post('/api/users/:id/documents', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), upload.array('documents', 10), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const targetUserId = String(req.params.id);
        const target = await prisma.user.findFirst({
            where: { id: targetUserId, schoolId: authUser.schoolId }
        });
        if (!target)
            return res.status(404).json({ error: 'User not found' });
        if (authUser.role !== 'ADMIN' && authUser.userId !== target.id) {
            return res.status(403).json({ error: 'You can upload documents only for your own account.' });
        }
        if (!Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one document file is required.' });
        }
        const files = req.files;
        const created = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const documentName = String(req.body[`documentName_${i}`] || '').trim();
            if (!documentName) {
                return res.status(400).json({ error: `Document name is required for file #${i + 1}.` });
            }
            const record = await prisma.document.create({
                data: {
                    userId: target.id,
                    fileName: documentName,
                    fileType: file.mimetype,
                    fileSize: file.size,
                    fileUrl: `/uploads/${file.filename}`,
                    remark: file.originalname
                }
            });
            created.push(record);
        }
        res.status(201).json({ message: 'Documents uploaded successfully', documents: created });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to upload documents', details: error.message });
    }
});
const updateUserStatusById = async (schoolId, targetUserId, status) => {
    if (!['ACTIVE', 'LOCKED'].includes(status)) {
        return { status: 400, body: { error: 'Invalid status' } };
    }
    const target = await prisma.user.findFirst({
        where: { id: targetUserId, schoolId }
    });
    if (!target)
        return { status: 404, body: { error: 'User not found' } };
    const user = await prisma.user.update({
        where: { id: target.id },
        data: { status: status }
    });
    return {
        status: 200,
        body: { message: 'Status updated', user: { id: user.id, status: user.status } }
    };
};
app.patch('/api/users/:id/status', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const result = await updateUserStatusById(authUser.schoolId, String(req.params.id), String(req.body?.status || ''));
        res.status(result.status).json(result.body);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user status', details: error.message });
    }
});
// Fallback for hosting environments that block PATCH at edge level.
app.post('/api/users/:id/status/update', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const result = await updateUserStatusById(authUser.schoolId, String(req.params.id), String(req.body?.status || ''));
        res.status(result.status).json(result.body);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user status', details: error.message });
    }
});
const deleteUserById = async (schoolId, targetUserId, actingUserId) => {
    const user = await prisma.user.findFirst({
        where: { id: targetUserId, schoolId }
    });
    if (!user)
        return { status: 404, body: { error: 'User not found' } };
    if (user.id === actingUserId)
        return { status: 400, body: { error: 'You cannot delete your own account' } };
    if (user.role === client_1.Role.TRAINER) {
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
        if (user.role === client_1.Role.STUDENT) {
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
        if (user.role === client_1.Role.TRAINER) {
            const trainerProfile = await tx.trainerProfile.findUnique({ where: { userId: user.id } });
            if (trainerProfile) {
                await tx.trainerProfile.delete({ where: { id: trainerProfile.id } });
            }
        }
        await tx.user.delete({ where: { id: user.id } });
    });
    return {
        status: 200,
        body: {
            message: `${user.firstName} ${user.lastName} (${user.role}) was removed successfully.`,
            deletedUser: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        }
    };
};
app.delete('/api/users/:id', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const targetUserId = String(req.params.id);
        const result = await deleteUserById(authUser.schoolId, targetUserId, authUser.userId);
        res.status(result.status).json(result.body);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
});
// Fallback for hosting environments that block DELETE at edge level.
app.post('/api/users/:id/delete', requireRoles('ADMIN'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        const targetUserId = String(req.params.id);
        const result = await deleteUserById(authUser.schoolId, targetUserId, authUser.userId);
        res.status(result.status).json(result.body);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
});
app.get('/api/attendance', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
        if (authUser.role === 'STUDENT') {
            const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: authUser.userId } });
            if (!studentProfile)
                return res.json([]);
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
            if (!trainerProfile)
                return res.json([]);
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
    }
});
app.get('/api/profile', requireRoles('ADMIN', 'TRAINER', 'STUDENT'), async (req, res) => {
    try {
        const authUser = getSchoolUserOrFail(req, res);
        if (!authUser)
            return;
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    }
});
app.use('/api/schedules', schedule_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/mock-tests', mockTests_1.default);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
