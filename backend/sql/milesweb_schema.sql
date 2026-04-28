-- drivingsync / Driving School Portal
-- MySQL schema export for phpMyAdmin / MilesWeb
-- Recommended: run this on a fresh empty database.
-- For existing databases, ensure these columns exist on `User`:
-- `admissionDate` DATETIME(3) NULL, `classType` VARCHAR(191) NULL, `joiningDate` DATETIME(3) NULL

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `School` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contactEmail` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(191) NULL,
  `ownerName` VARCHAR(191) NULL,
  `ownerEmail` VARCHAR(191) NULL,
  `ownerMobile` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `city` VARCHAR(191) NULL,
  `pincode` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SuperAdmin` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(191) NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SuperAdmin_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN', 'STUDENT', 'TRAINER') NOT NULL,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `dateOfBirth` DATETIME(3) NULL,
  `admissionDate` DATETIME(3) NULL,
  `classType` VARCHAR(191) NULL,
  `joiningDate` DATETIME(3) NULL,
  `status` ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  KEY `User_schoolId_idx` (`schoolId`),
  CONSTRAINT `User_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `School` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `StudentProfile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `licenseStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
  `totalPaid` DOUBLE NOT NULL DEFAULT 0,
  `balanceDue` DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `StudentProfile_userId_key` (`userId`),
  CONSTRAINT `StudentProfile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TrainerProfile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `availabilityStatus` VARCHAR(191) NOT NULL DEFAULT 'Available',
  PRIMARY KEY (`id`),
  UNIQUE KEY `TrainerProfile_userId_key` (`userId`),
  CONSTRAINT `TrainerProfile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Course` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `durationDays` INT NOT NULL,
  `price` DOUBLE NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Course_schoolId_idx` (`schoolId`),
  CONSTRAINT `Course_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `School` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ClassSchedule` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `trainerId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NULL,
  `startTime` DATETIME(3) NOT NULL,
  `endTime` DATETIME(3) NULL,
  `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `notes` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `ClassSchedule_schoolId_idx` (`schoolId`),
  KEY `ClassSchedule_courseId_idx` (`courseId`),
  KEY `ClassSchedule_trainerId_idx` (`trainerId`),
  KEY `ClassSchedule_studentId_idx` (`studentId`),
  CONSTRAINT `ClassSchedule_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `School` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ClassSchedule_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `Course` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ClassSchedule_trainerId_fkey`
    FOREIGN KEY (`trainerId`) REFERENCES `TrainerProfile` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ClassSchedule_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentProfile` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Attendance` (
  `id` VARCHAR(191) NOT NULL,
  `scheduleId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('PRESENT', 'ABSENT') NOT NULL,
  `markedBy` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Attendance_scheduleId_idx` (`scheduleId`),
  KEY `Attendance_studentId_idx` (`studentId`),
  CONSTRAINT `Attendance_scheduleId_fkey`
    FOREIGN KEY (`scheduleId`) REFERENCES `ClassSchedule` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Attendance_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentProfile` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Payment` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `method` VARCHAR(191) NOT NULL DEFAULT 'CASH',
  `status` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `notes` TEXT NULL,
  `proofUrl` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `dueDate` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `Payment_schoolId_idx` (`schoolId`),
  KEY `Payment_studentId_idx` (`studentId`),
  CONSTRAINT `Payment_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `School` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Payment_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentProfile` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MockTest` (
  `id` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `passingScore` INT NOT NULL DEFAULT 80,
  `timeLimitMinutes` INT NOT NULL DEFAULT 30,
  PRIMARY KEY (`id`),
  KEY `MockTest_schoolId_idx` (`schoolId`),
  CONSTRAINT `MockTest_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `School` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Question` (
  `id` VARCHAR(191) NOT NULL,
  `testId` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `options` TEXT NOT NULL,
  `correctAnswer` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Question_testId_idx` (`testId`),
  CONSTRAINT `Question_testId_fkey`
    FOREIGN KEY (`testId`) REFERENCES `MockTest` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TestResult` (
  `id` VARCHAR(191) NOT NULL,
  `testId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `score` INT NOT NULL,
  `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TestResult_testId_idx` (`testId`),
  KEY `TestResult_studentId_idx` (`studentId`),
  CONSTRAINT `TestResult_testId_fkey`
    FOREIGN KEY (`testId`) REFERENCES `MockTest` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TestResult_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `StudentProfile` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Document` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileType` VARCHAR(191) NOT NULL,
  `fileSize` INT NOT NULL,
  `fileUrl` VARCHAR(191) NOT NULL,
  `remark` VARCHAR(191) NULL,
  `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Document_userId_idx` (`userId`),
  CONSTRAINT `Document_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
