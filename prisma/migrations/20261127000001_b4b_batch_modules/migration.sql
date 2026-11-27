CREATE TABLE `BatchModule` (
    `batchId` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `BatchModule_moduleId_idx`(`moduleId`),
    INDEX `BatchModule_batchId_sortOrder_idx`(`batchId`, `sortOrder`),
    PRIMARY KEY (`batchId`, `moduleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BatchModule` ADD CONSTRAINT `BatchModule_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `BatchModule` ADD CONSTRAINT `BatchModule_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
