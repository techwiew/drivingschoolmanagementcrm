-- Run this script on your existing MySQL database
-- to enable Book Demo form storage from the website.
-- It handles both fresh setup and existing table updates.

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

ALTER TABLE `DemoRequest`
  ADD COLUMN IF NOT EXISTS `fullName` VARCHAR(191) NOT NULL,
  ADD COLUMN IF NOT EXISTS `schoolName` VARCHAR(191) NOT NULL,
  ADD COLUMN IF NOT EXISTS `workEmail` VARCHAR(191) NOT NULL,
  ADD COLUMN IF NOT EXISTS `phoneNumber` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `preferredDate` DATETIME(3) NOT NULL,
  ADD COLUMN IF NOT EXISTS `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
