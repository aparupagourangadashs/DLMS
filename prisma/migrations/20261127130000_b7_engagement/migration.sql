CREATE TABLE `Community` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(200) NOT NULL, `description` TEXT NOT NULL,
  `layout` ENUM('MESSAGE','FEED') NOT NULL DEFAULT 'MESSAGE', `batchId` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE','HIDDEN','ARCHIVED') NOT NULL DEFAULT 'ACTIVE', `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Community_name_key`(`name`), INDEX `Community_status_sortOrder_idx`(`status`,`sortOrder`),
  INDEX `Community_batchId_idx`(`batchId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityMember` (
  `communityId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('MEMBER','MODERATOR') NOT NULL DEFAULT 'MEMBER',
  `status` ENUM('ACTIVE','REMOVED','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CommunityMember_userId_status_idx`(`userId`,`status`),
  PRIMARY KEY (`communityId`,`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityPost` (
  `id` VARCHAR(191) NOT NULL, `communityId` VARCHAR(191) NOT NULL, `authorId` VARCHAR(191) NOT NULL,
  `parentId` VARCHAR(191) NULL, `body` TEXT NOT NULL, `pinned` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('VISIBLE','HIDDEN','REMOVED') NOT NULL DEFAULT 'VISIBLE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `CommunityPost_communityId_status_pinned_createdAt_idx`(`communityId`,`status`,`pinned`,`createdAt`),
  INDEX `CommunityPost_authorId_idx`(`authorId`), INDEX `CommunityPost_parentId_idx`(`parentId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityReport` (
  `id` VARCHAR(191) NOT NULL, `postId` VARCHAR(191) NOT NULL, `reporterId` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(500) NOT NULL, `status` ENUM('OPEN','REVIEWED','DISMISSED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CommunityReport_postId_status_idx`(`postId`,`status`), INDEX `CommunityReport_reporterId_idx`(`reporterId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MessageTemplate` (
  `id` VARCHAR(191) NOT NULL, `channel` ENUM('EMAIL','WHATSAPP','SMS','PUSH') NOT NULL,
  `name` VARCHAR(100) NOT NULL, `subject` VARCHAR(200) NULL, `body` TEXT NOT NULL,
  `replyTo` VARCHAR(254) NULL, `unsubscribeText` VARCHAR(200) NULL, `providerTemplateId` VARCHAR(200) NULL,
  `approvalStatus` VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED', `variables` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MessageTemplate_channel_name_key`(`channel`,`name`),
  INDEX `MessageTemplate_channel_approvalStatus_idx`(`channel`,`approvalStatus`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Campaign` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(200) NOT NULL, `type` VARCHAR(40) NOT NULL DEFAULT 'PROMOTIONAL',
  `channel` ENUM('EMAIL','WHATSAPP','SMS','PUSH') NOT NULL, `templateId` VARCHAR(191) NOT NULL,
  `segmentId` VARCHAR(191) NULL, `status` ENUM('DRAFT','SCHEDULED','SENDING','SENT','FAILED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `scheduledAt` DATETIME(3) NULL, `sentCount` INTEGER NOT NULL DEFAULT 0, `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Campaign_status_scheduledAt_idx`(`status`,`scheduledAt`), INDEX `Campaign_segmentId_idx`(`segmentId`),
  INDEX `Campaign_templateId_idx`(`templateId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CampaignRecipient` (
  `id` VARCHAR(191) NOT NULL, `campaignId` VARCHAR(191) NOT NULL, `learnerId` VARCHAR(191) NOT NULL,
  `status` ENUM('QUEUED','SENT','DELIVERED','FAILED','OPTED_OUT') NOT NULL DEFAULT 'QUEUED',
  `providerRef` VARCHAR(191) NULL, `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CampaignRecipient_campaignId_learnerId_key`(`campaignId`,`learnerId`),
  INDEX `CampaignRecipient_learnerId_status_idx`(`learnerId`,`status`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationLog` (
  `id` VARCHAR(191) NOT NULL, `channel` ENUM('EMAIL','WHATSAPP','SMS','PUSH') NOT NULL,
  `recipient` VARCHAR(254) NOT NULL, `learnerId` VARCHAR(191) NULL, `templateId` VARCHAR(191) NULL,
  `relatedType` VARCHAR(40) NULL, `relatedId` VARCHAR(191) NULL,
  `status` ENUM('QUEUED','SENT','DELIVERED','FAILED','OPTED_OUT') NOT NULL DEFAULT 'QUEUED',
  `providerMessageId` VARCHAR(191) NULL, `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `NotificationLog_channel_status_createdAt_idx`(`channel`,`status`,`createdAt`),
  INDEX `NotificationLog_learnerId_createdAt_idx`(`learnerId`,`createdAt`),
  INDEX `NotificationLog_templateId_idx`(`templateId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemNotificationSetting` (
  `id` VARCHAR(191) NOT NULL, `eventFamily` VARCHAR(40) NOT NULL, `eventKey` VARCHAR(60) NOT NULL,
  `channels` JSON NOT NULL, `enabled` BOOLEAN NOT NULL DEFAULT true, `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SystemNotificationSetting_eventFamily_eventKey_key`(`eventFamily`,`eventKey`),
  INDEX `SystemNotificationSetting_enabled_idx`(`enabled`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WalletAccount` (
  `id` VARCHAR(191) NOT NULL, `channel` ENUM('WHATSAPP','SMS','EMAIL','AI') NOT NULL,
  `balance` INTEGER NOT NULL DEFAULT 0, `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WalletAccount_channel_key`(`channel`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WalletTransaction` (
  `id` VARCHAR(191) NOT NULL, `accountId` VARCHAR(191) NOT NULL,
  `kind` ENUM('CREDIT','DEBIT') NOT NULL, `amount` INTEGER NOT NULL, `balanceAfter` INTEGER NOT NULL,
  `referenceId` VARCHAR(191) NULL, `description` VARCHAR(500) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `WalletTransaction_accountId_createdAt_idx`(`accountId`,`createdAt`),
  INDEX `WalletTransaction_referenceId_idx`(`referenceId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommunityMember` ADD CONSTRAINT `CommunityMember_communityId_fkey` FOREIGN KEY (`communityId`) REFERENCES `Community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityMember` ADD CONSTRAINT `CommunityMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_communityId_fkey` FOREIGN KEY (`communityId`) REFERENCES `Community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityReport` ADD CONSTRAINT `CommunityReport_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityReport` ADD CONSTRAINT `CommunityReport_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `MessageTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `Segment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CampaignRecipient` ADD CONSTRAINT `CampaignRecipient_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CampaignRecipient` ADD CONSTRAINT `CampaignRecipient_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NotificationLog` ADD CONSTRAINT `NotificationLog_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `WalletAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
