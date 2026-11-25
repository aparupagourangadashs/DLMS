/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `LearnerProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `learnerprofile` ADD COLUMN `alternateMobile` VARCHAR(191) NULL,
    ADD COLUMN `branchId` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `dateOfBirth` DATE NULL,
    ADD COLUMN `gender` VARCHAR(191) NULL,
    ADD COLUMN `parentEmail` VARCHAR(191) NULL,
    ADD COLUMN `parentName` VARCHAR(191) NULL,
    ADD COLUMN `parentPhone` VARCHAR(191) NULL,
    ADD COLUMN `permanentAddress` TEXT NULL,
    ADD COLUMN `pincode` VARCHAR(191) NULL,
    ADD COLUMN `residentialAddress` TEXT NULL,
    ADD COLUMN `standard` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('REGISTERED', 'ON_LEAVE', 'ARCHIVED') NOT NULL DEFAULT 'REGISTERED',
    ADD COLUMN `studentSource` VARCHAR(191) NULL,
    ADD COLUMN `timezoneAuto` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `username` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Counter` (
    `key` VARCHAR(60) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `userId` VARCHAR(191) NOT NULL,
    `sessionReminder1Hour` BOOLEAN NOT NULL DEFAULT true,
    `sessionReminder1Day` BOOLEAN NOT NULL DEFAULT false,
    `sessionReminderStart` BOOLEAN NOT NULL DEFAULT false,
    `promotional` BOOLEAN NOT NULL DEFAULT false,
    `whatsapp` BOOLEAN NOT NULL DEFAULT false,
    `email` BOOLEAN NOT NULL DEFAULT true,
    `sms` BOOLEAN NOT NULL DEFAULT false,
    `push` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `assignedToId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `SupportRequest_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `SupportRequest_assignedToId_idx`(`assignedToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportReply` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportReply_requestId_createdAt_idx`(`requestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomField` (
    `id` VARCHAR(191) NOT NULL,
    `entity` ENUM('LEARNER', 'INSTRUCTOR', 'COURSE', 'BATCH', 'CERTIFICATE', 'QUESTION', 'ANNOUNCEMENT', 'ENQUIRY') NOT NULL,
    `placement` ENUM('SIGNUP', 'OFFLINE_ADMISSION') NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Text',
    `options` JSON NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomField_entity_placement_sortOrder_idx`(`entity`, `placement`, `sortOrder`),
    UNIQUE INDEX `CustomField_entity_placement_label_key`(`entity`, `placement`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomFieldValue` (
    `id` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomFieldValue_entityId_idx`(`entityId`),
    UNIQUE INDEX `CustomFieldValue_fieldId_entityId_key`(`fieldId`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Segment` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('STATIC', 'DYNAMIC') NOT NULL,
    `rules` JSON NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Segment_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SegmentMember` (
    `segmentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `SegmentMember_userId_idx`(`userId`),
    PRIMARY KEY (`segmentId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `LearnerProfile_username_key` ON `LearnerProfile`(`username`);

-- CreateIndex
CREATE INDEX `LearnerProfile_status_createdAt_idx` ON `LearnerProfile`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `LearnerProfile_branchId_idx` ON `LearnerProfile`(`branchId`);

-- CreateIndex
CREATE INDEX `LearnerProfile_city_idx` ON `LearnerProfile`(`city`);

-- AddForeignKey
ALTER TABLE `LearnerProfile` ADD CONSTRAINT `LearnerProfile_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportRequest` ADD CONSTRAINT `SupportRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportRequest` ADD CONSTRAINT `SupportRequest_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportReply` ADD CONSTRAINT `SupportReply_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `SupportRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportReply` ADD CONSTRAINT `SupportReply_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomFieldValue` ADD CONSTRAINT `CustomFieldValue_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `CustomField`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentMember` ADD CONSTRAINT `SegmentMember_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `Segment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentMember` ADD CONSTRAINT `SegmentMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
