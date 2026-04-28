-- --------------------------------------------
-- PART A: Schema updates for new features
-- --------------------------------------------

ALTER TABLE `School`
  ADD COLUMN `mobile` VARCHAR(191) NULL,
  ADD COLUMN `ownerName` VARCHAR(191) NULL,
  ADD COLUMN `ownerEmail` VARCHAR(191) NULL,
  ADD COLUMN `ownerMobile` VARCHAR(191) NULL,
  ADD COLUMN `location` VARCHAR(191) NULL,
  ADD COLUMN `city` VARCHAR(191) NULL,
  ADD COLUMN `pincode` VARCHAR(191) NULL;

ALTER TABLE `ClassSchedule`
  ADD COLUMN `studentId` VARCHAR(191) NULL;

ALTER TABLE `ClassSchedule`
  MODIFY `endTime` DATETIME(3) NULL;

ALTER TABLE `ClassSchedule`
  ADD CONSTRAINT `ClassSchedule_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `StudentProfile`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `SuperAdmin` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(191) NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `SuperAdmin_email_key` (`email`)
);

-- --------------------------------------------
-- PART B: Seed data
-- --------------------------------------------

-- School table already exists as shared by you:
-- INSERT INTO School (id, name, createdAt) VALUES ('school-001', 'Demo Driving School', NOW());

-- Super Admin (password: SuperAdmin@123)
INSERT INTO `SuperAdmin` (`id`, `name`, `email`, `mobile`, `passwordHash`, `status`, `createdAt`)
VALUES (
  'super-admin-001',
  'Platform Super Admin',
  'superadmin@drivingsync.com',
  '9999990000',
  '$2b$10$6ixXsWLAMKLJq.sEuGlQZO70JttXinVd33u8z2M5TfQccVzlMQ0dm',
  'ACTIVE',
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `mobile` = VALUES(`mobile`),
  `passwordHash` = VALUES(`passwordHash`),
  `status` = VALUES(`status`);

-- School Admin (password: Admin@123)
INSERT INTO `User`
(`id`, `schoolId`, `email`, `passwordHash`, `role`, `firstName`, `lastName`, `phone`, `location`, `status`, `createdAt`)
VALUES
(
  'admin-001',
  'school-001',
  'admin@drivingschool.com',
  '$2b$10$Rp53DUP3kCUnX3mJMyY/o.RlOyMaK1lDgU.O9w8LhPWZfqvsOhOoW',
  'ADMIN',
  'School',
  'Admin',
  '9999991111',
  'Pune',
  'ACTIVE',
  NOW()
)
ON DUPLICATE KEY UPDATE
  `passwordHash` = VALUES(`passwordHash`),
  `status` = VALUES(`status`),
  `phone` = VALUES(`phone`),
  `location` = VALUES(`location`);

-- Trainer (password: Trainer@123)
INSERT INTO `User`
(`id`, `schoolId`, `email`, `passwordHash`, `role`, `firstName`, `lastName`, `phone`, `location`, `status`, `createdAt`)
VALUES
(
  'trainer-user-001',
  'school-001',
  'trainer@drivingschool.com',
  '$2b$10$dRxsJThQ3Vx7gxCZImNNkOMUsrzQd.Mb/xCRl8aLYRPwXpn3MbR3a',
  'TRAINER',
  'Rahul',
  'Trainer',
  '9999992222',
  'Pune',
  'ACTIVE',
  NOW()
)
ON DUPLICATE KEY UPDATE
  `passwordHash` = VALUES(`passwordHash`),
  `status` = VALUES(`status`),
  `phone` = VALUES(`phone`),
  `location` = VALUES(`location`);

INSERT INTO `TrainerProfile` (`id`, `userId`, `availabilityStatus`)
VALUES ('trainer-profile-001', 'trainer-user-001', 'Available')
ON DUPLICATE KEY UPDATE
  `availabilityStatus` = VALUES(`availabilityStatus`);

-- Student (password: Student@123)
INSERT INTO `User`
(`id`, `schoolId`, `email`, `passwordHash`, `role`, `firstName`, `lastName`, `phone`, `location`, `status`, `createdAt`)
VALUES
(
  'student-user-001',
  'school-001',
  'student@drivingschool.com',
  '$2b$10$pehYa88xr6vymt1J9j8pMu3H66bWoMGI6BnhNUKBCwFZgE3ocT4Gy',
  'STUDENT',
  'Priya',
  'Student',
  '9999993333',
  'Pune',
  'ACTIVE',
  NOW()
)
ON DUPLICATE KEY UPDATE
  `passwordHash` = VALUES(`passwordHash`),
  `status` = VALUES(`status`),
  `phone` = VALUES(`phone`),
  `location` = VALUES(`location`);

INSERT INTO `StudentProfile` (`id`, `userId`, `licenseStatus`, `totalPaid`, `balanceDue`)
VALUES ('student-profile-001', 'student-user-001', 'Pending', 0, 0)
ON DUPLICATE KEY UPDATE
  `licenseStatus` = VALUES(`licenseStatus`);

