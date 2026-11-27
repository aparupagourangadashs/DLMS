CREATE TABLE `UserActivity` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `kind` ENUM('LOGIN','PAGE_VIEW','LESSON_START','LESSON_COMPLETE','DOWNLOAD','COMMUNITY_POST','EXAM_SUBMIT','CERTIFICATE_VIEW') NOT NULL,
  `path` VARCHAR(300) NOT NULL,
  `relatedId` VARCHAR(191) NULL,
  `durationSec` INTEGER NOT NULL DEFAULT 0,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `UserActivity_userId_occurredAt_idx`(`userId`,`occurredAt`),
  INDEX `UserActivity_kind_occurredAt_idx`(`kind`,`occurredAt`),
  INDEX `UserActivity_occurredAt_idx`(`occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
