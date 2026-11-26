-- AlterTable
ALTER TABLE `modulecontent` ADD COLUMN `assetId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('TEXT', 'VIDEO', 'LINK', 'FILE') NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE `Asset` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('VIDEO', 'AUDIO', 'PDF', 'YOUTUBE', 'IMAGE', 'DOC', 'SHEET', 'SLIDE', 'TEXT_HTML', 'ZIP', 'SCORM_ZIP', 'LINK', 'EPUB') NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('STAGED', 'READY') NOT NULL DEFAULT 'STAGED',
    `fileName` VARCHAR(255) NULL,
    `storageKey` VARCHAR(80) NULL,
    `mimeType` VARCHAR(100) NULL,
    `sizeBytes` INTEGER NULL,
    `sha256` CHAR(64) NULL,
    `url` VARCHAR(500) NULL,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Asset_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Asset_type_idx`(`type`),
    INDEX `Asset_sha256_idx`(`sha256`),
    INDEX `Asset_storageKey_idx`(`storageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ModuleContent_assetId_idx` ON `ModuleContent`(`assetId`);

-- AddForeignKey
ALTER TABLE `ModuleContent` ADD CONSTRAINT `ModuleContent_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
