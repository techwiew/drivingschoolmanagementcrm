-- Run this script on your existing MySQL database
-- to enable Book Demo form storage from the website.
-- It handles both fresh setup and existing table updates.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS `DemoRequest` (
  `id` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `schoolName` VARCHAR(191) NOT NULL,
  `workEmail` VARCHAR(191) NOT NULL,
  `phoneNumber` VARCHAR(191) NULL,
  `preferredDate` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DemoRequest_createdAt_idx` (`createdAt`),
  KEY `DemoRequest_workEmail_idx` (`workEmail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db_name = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND COLUMN_NAME = 'fullName') = 0,
  'ALTER TABLE `DemoRequest` ADD COLUMN `fullName` VARCHAR(191) NOT NULL',
  'SELECT ''Column fullName already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND COLUMN_NAME = 'schoolName') = 0,
  'ALTER TABLE `DemoRequest` ADD COLUMN `schoolName` VARCHAR(191) NOT NULL',
  'SELECT ''Column schoolName already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND COLUMN_NAME = 'workEmail') = 0,
  'ALTER TABLE `DemoRequest` ADD COLUMN `workEmail` VARCHAR(191) NOT NULL',
  'SELECT ''Column workEmail already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND COLUMN_NAME = 'phoneNumber') = 0,
  'ALTER TABLE `DemoRequest` ADD COLUMN `phoneNumber` VARCHAR(191) NULL',
  'SELECT ''Column phoneNumber already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND COLUMN_NAME = 'preferredDate') = 0,
  'ALTER TABLE `DemoRequest` ADD COLUMN `preferredDate` DATETIME(3) NOT NULL',
  'SELECT ''Column preferredDate already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND COLUMN_NAME = 'createdAt') = 0,
  'ALTER TABLE `DemoRequest` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
  'SELECT ''Column createdAt already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND INDEX_NAME = 'DemoRequest_createdAt_idx') = 0,
  'ALTER TABLE `DemoRequest` ADD INDEX `DemoRequest_createdAt_idx` (`createdAt`)',
  'SELECT ''Index DemoRequest_createdAt_idx already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'DemoRequest' AND INDEX_NAME = 'DemoRequest_workEmail_idx') = 0,
  'ALTER TABLE `DemoRequest` ADD INDEX `DemoRequest_workEmail_idx` (`workEmail`)',
  'SELECT ''Index DemoRequest_workEmail_idx already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
