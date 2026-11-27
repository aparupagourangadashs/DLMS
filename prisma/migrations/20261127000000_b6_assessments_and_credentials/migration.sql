-- CreateEnum
CREATE TABLE `QuestionBank` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `difficulty` VARCHAR(20) NOT NULL,
    `exam` VARCHAR(200) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `topic` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `QuestionBank_code_key`(`code`),
    INDEX `QuestionBank_status_difficulty_idx`(`status`, `difficulty`),
    INDEX `QuestionBank_subject_topic_idx`(`subject`, `topic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `bankId` VARCHAR(191) NOT NULL,
    `type` ENUM('MCQ', 'MULTI', 'TEXT', 'FILE') NOT NULL,
    `prompt` TEXT NOT NULL,
    `options` JSON NOT NULL,
    `answer` JSON NULL,
    `marks` INTEGER NOT NULL DEFAULT 1,
    `explanation` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Question_bankId_sortOrder_idx`(`bankId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Assessment` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `kind` ENUM('ASSIGNMENT', 'CUSTOM_LINK', 'EXAM') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `priceMinor` INTEGER NULL,
    `maxAttempts` INTEGER NOT NULL DEFAULT 1,
    `opensAt` DATETIME(3) NULL,
    `closesAt` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `totalMarks` INTEGER NOT NULL DEFAULT 0,
    `passPercent` INTEGER NOT NULL DEFAULT 40,
    `bankId` VARCHAR(191) NULL,
    `linkUrl` VARCHAR(500) NULL,
    `instructions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Assessment_status_kind_idx`(`status`, `kind`),
    INDEX `Assessment_bankId_idx`(`bankId`),
    INDEX `Assessment_opensAt_closesAt_idx`(`opensAt`, `closesAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AssessmentCourse` (
    `assessmentId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    INDEX `AssessmentCourse_courseId_idx`(`courseId`),
    PRIMARY KEY (`assessmentId`, `courseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AssessmentRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `AssessmentRegistration_assessmentId_learnerId_key`(`assessmentId`, `learnerId`),
    INDEX `AssessmentRegistration_learnerId_idx`(`learnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Attempt` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedAt` DATETIME(3) NULL,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `answers` JSON NOT NULL,
    `autoScore` INTEGER NULL,
    `durationSeconds` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Attempt_assessmentId_learnerId_status_idx`(`assessmentId`, `learnerId`, `status`),
    INDEX `Attempt_learnerId_startedAt_idx`(`learnerId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Submission` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,
    `fileAssetId` VARCHAR(191) NULL,
    `text` TEXT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `evaluationStatus` ENUM('NOT_EVALUATED', 'EVALUATED') NOT NULL DEFAULT 'NOT_EVALUATED',
    `marks` INTEGER NULL,
    `total` INTEGER NOT NULL DEFAULT 0,
    `evaluatedById` VARCHAR(191) NULL,
    `evaluatedAt` DATETIME(3) NULL,
    `feedback` TEXT NULL,
    `late` BOOLEAN NOT NULL DEFAULT false,
    UNIQUE INDEX `Submission_attemptId_key`(`attemptId`),
    INDEX `Submission_assessmentId_evaluationStatus_idx`(`assessmentId`, `evaluationStatus`),
    INDEX `Submission_learnerId_submittedAt_idx`(`learnerId`, `submittedAt`),
    INDEX `Submission_evaluatedById_idx`(`evaluatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GradeBand` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `minPercent` INTEGER NOT NULL,
    `maxPercent` INTEGER NOT NULL,
    `remark` VARCHAR(80) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `GradeBand_sortOrder_idx`(`sortOrder`),
    INDEX `GradeBand_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FeedbackForm` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `courseId` VARCHAR(191) NULL,
    `sessionName` VARCHAR(200) NULL,
    `template` VARCHAR(40) NOT NULL DEFAULT 'Blank',
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `FeedbackForm_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `FeedbackForm_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FeedbackQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `prompt` VARCHAR(500) NOT NULL,
    `type` ENUM('RATING', 'TEXT', 'CHOICE') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `options` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    INDEX `FeedbackQuestion_formId_sortOrder_idx`(`formId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FeedbackResponse` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NULL,
    `answers` JSON NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `FeedbackResponse_formId_submittedAt_idx`(`formId`, `submittedAt`),
    INDEX `FeedbackResponse_learnerId_idx`(`learnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CertificateTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `serialPrefix` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `expiryRule` VARCHAR(20) NOT NULL DEFAULT 'LIFETIME',
    `expiryDays` INTEGER NULL,
    `expiryDate` DATE NULL,
    `designSource` VARCHAR(20) NOT NULL DEFAULT 'BUILDER',
    `layout` VARCHAR(20) NOT NULL DEFAULT 'LANDSCAPE',
    `heading` VARCHAR(200) NULL,
    `body` TEXT NULL,
    `signatory` VARCHAR(200) NULL,
    `templateAssetId` VARCHAR(191) NULL,
    `customFields` JSON NOT NULL,
    `automation` ENUM('MANUAL', 'COURSE_COMPLETION', 'EXAM_PASSED') NOT NULL DEFAULT 'MANUAL',
    `courseId` VARCHAR(191) NULL,
    `examAssessmentId` VARCHAR(191) NULL,
    `threshold` INTEGER NOT NULL DEFAULT 100,
    `notifyConfig` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `CertificateTemplate_status_idx`(`status`),
    INDEX `CertificateTemplate_templateAssetId_idx`(`templateAssetId`),
    INDEX `CertificateTemplate_automation_idx`(`automation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Certificate` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `learnerId` VARCHAR(191) NOT NULL,
    `serial` VARCHAR(60) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `fileAssetId` VARCHAR(191) NULL,
    `verificationCode` VARCHAR(40) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokedReason` VARCHAR(500) NULL,
    UNIQUE INDEX `Certificate_serial_key`(`serial`),
    UNIQUE INDEX `Certificate_verificationCode_key`(`verificationCode`),
    INDEX `Certificate_learnerId_status_issuedAt_idx`(`learnerId`, `status`, `issuedAt`),
    INDEX `Certificate_templateId_status_idx`(`templateId`, `status`),
    INDEX `Certificate_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Question` ADD CONSTRAINT `Question_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `QuestionBank`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `QuestionBank`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AssessmentCourse` ADD CONSTRAINT `AssessmentCourse_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `Assessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AssessmentCourse` ADD CONSTRAINT `AssessmentCourse_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AssessmentRegistration` ADD CONSTRAINT `AssessmentRegistration_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `Assessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AssessmentRegistration` ADD CONSTRAINT `AssessmentRegistration_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `Assessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `Assessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_evaluatedById_fkey` FOREIGN KEY (`evaluatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `GradeBand` ADD CONSTRAINT `GradeBand_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FeedbackForm` ADD CONSTRAINT `FeedbackForm_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FeedbackQuestion` ADD CONSTRAINT `FeedbackQuestion_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FeedbackForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FeedbackResponse` ADD CONSTRAINT `FeedbackResponse_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FeedbackForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FeedbackResponse` ADD CONSTRAINT `FeedbackResponse_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CertificateTemplate` ADD CONSTRAINT `CertificateTemplate_templateAssetId_fkey` FOREIGN KEY (`templateAssetId`) REFERENCES `Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Certificate` ADD CONSTRAINT `Certificate_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `CertificateTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Certificate` ADD CONSTRAINT `Certificate_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Certificate` ADD CONSTRAINT `Certificate_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
