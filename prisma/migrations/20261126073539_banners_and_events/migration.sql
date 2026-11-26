-- CreateTable
CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` VARCHAR(400) NULL,
    `imageAssetId` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(500) NULL,
    `placement` ENUM('WEBSITE_HOME', 'STUDENT_HOME') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `startsOn` DATE NULL,
    `endsOn` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Banner_placement_status_sortOrder_idx`(`placement`, `status`, `sortOrder`),
    INDEX `Banner_imageAssetId_idx`(`imageAssetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `imageAssetId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'DRAFT',
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'UNLISTED') NOT NULL DEFAULT 'PUBLIC',
    `platform` ENUM('IN_PERSON', 'ZOOM', 'YOUTUBE_LIVE', 'OTHER_ONLINE', 'HYBRID') NOT NULL,
    `venue` VARCHAR(300) NULL,
    `meetingLink` VARCHAR(500) NULL,
    `guestsAllowed` BOOLEAN NOT NULL DEFAULT false,
    `managerId` VARCHAR(191) NULL,
    `category` VARCHAR(40) NOT NULL,
    `membershipEligibility` VARCHAR(40) NOT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `priceMinor` INTEGER NULL,
    `currency` VARCHAR(3) NULL,
    `capacity` INTEGER NULL,
    `pricingNotes` TEXT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Event_status_visibility_idx`(`status`, `visibility`),
    INDEX `Event_startsAt_idx`(`startsAt`),
    INDEX `Event_managerId_idx`(`managerId`),
    INDEX `Event_imageAssetId_idx`(`imageAssetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventDay` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `EventDay_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Banner` ADD CONSTRAINT `Banner_imageAssetId_fkey` FOREIGN KEY (`imageAssetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_imageAssetId_fkey` FOREIGN KEY (`imageAssetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventDay` ADD CONSTRAINT `EventDay_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
