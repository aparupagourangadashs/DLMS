ALTER TABLE `Enrolment` ADD COLUMN `orderId` VARCHAR(191) NULL;

CREATE TABLE `Order` (
  `id` VARCHAR(191) NOT NULL,
  `number` VARCHAR(30) NOT NULL,
  `learnerId` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','PENDING','PAID','FAILED','CANCELLED','REFUND_PARTIAL','REFUND_FULL','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `subtotalMinor` INTEGER NOT NULL DEFAULT 0,
  `discountMinor` INTEGER NOT NULL DEFAULT 0,
  `taxMinor` INTEGER NOT NULL DEFAULT 0,
  `feeMinor` INTEGER NOT NULL DEFAULT 0,
  `totalMinor` INTEGER NOT NULL DEFAULT 0,
  `promoCodeId` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Order_number_key`(`number`),
  INDEX `Order_learnerId_status_createdAt_idx`(`learnerId`,`status`,`createdAt`),
  INDEX `Order_status_createdAt_idx`(`status`,`createdAt`),
  INDEX `Order_promoCodeId_idx`(`promoCodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderItem` (
  `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `kind` ENUM('COURSE','EVENT','MEMBERSHIP','ASSESSMENT','FEE','REFUND') NOT NULL,
  `productId` VARCHAR(191) NULL, `name` VARCHAR(300) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1, `unitMinor` INTEGER NOT NULL DEFAULT 0,
  `discountMinor` INTEGER NOT NULL DEFAULT 0, `taxMinor` INTEGER NOT NULL DEFAULT 0,
  `totalMinor` INTEGER NOT NULL DEFAULT 0,
  INDEX `OrderItem_orderId_idx`(`orderId`), INDEX `OrderItem_kind_productId_idx`(`kind`,`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(40) NOT NULL DEFAULT 'RAZORPAY',
  `providerOrderId` VARCHAR(100) NOT NULL, `providerPaymentId` VARCHAR(100) NULL,
  `status` ENUM('CREATED','AUTHORISED','PAID','FAILED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'CREATED',
  `method` VARCHAR(40) NULL, `amountMinor` INTEGER NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `rawEventRef` VARCHAR(191) NULL, `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Payment_providerOrderId_key`(`providerOrderId`),
  UNIQUE INDEX `Payment_providerPaymentId_key`(`providerPaymentId`),
  INDEX `Payment_orderId_status_idx`(`orderId`,`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentEvent` (
  `id` VARCHAR(191) NOT NULL, `paymentId` VARCHAR(191) NULL,
  `provider` VARCHAR(40) NOT NULL, `eventId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(100) NOT NULL, `payload` JSON NOT NULL,
  `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PaymentEvent_eventId_key`(`eventId`),
  INDEX `PaymentEvent_provider_type_idx`(`provider`,`type`),
  INDEX `PaymentEvent_paymentId_idx`(`paymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Refund` (
  `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `amountMinor` INTEGER NOT NULL, `reason` TEXT NOT NULL, `providerRef` VARCHAR(100) NULL,
  `processedById` VARCHAR(191) NULL, `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Refund_orderId_processedAt_idx`(`orderId`,`processedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Invoice` (
  `id` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `number` VARCHAR(40) NOT NULL, `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `pdfAssetId` VARCHAR(191) NULL, `taxJson` JSON NOT NULL,
  UNIQUE INDEX `Invoice_orderId_key`(`orderId`), UNIQUE INDEX `Invoice_number_key`(`number`),
  INDEX `Invoice_issuedAt_idx`(`issuedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MembershipPlan` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(200) NOT NULL,
  `description` TEXT NULL, `priceMinor` INTEGER NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `interval` ENUM('MONTHLY','QUARTERLY','YEARLY','LIFETIME') NOT NULL DEFAULT 'MONTHLY',
  `benefits` JSON NOT NULL, `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MembershipPlan_name_key`(`name`), INDEX `MembershipPlan_status_sortOrder_idx`(`status`,`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Membership` (
  `id` VARCHAR(191) NOT NULL, `learnerId` VARCHAR(191) NOT NULL, `planId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NULL, `status` ENUM('ACTIVE','EXPIRED','CANCELLED','PENDING') NOT NULL DEFAULT 'PENDING',
  `startsAt` DATETIME(3) NOT NULL, `endsAt` DATETIME(3) NULL, `cancelledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Membership_learnerId_status_endsAt_idx`(`learnerId`,`status`,`endsAt`),
  INDEX `Membership_planId_status_idx`(`planId`,`status`), INDEX `Membership_orderId_idx`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromoCode` (
  `id` VARCHAR(191) NOT NULL, `code` VARCHAR(50) NOT NULL,
  `kind` ENUM('SINGLE_USE','MULTI_USE') NOT NULL,
  `discountType` ENUM('PERCENT','FIXED') NOT NULL, `value` INTEGER NOT NULL,
  `minSpendMinor` INTEGER NULL, `capMinor` INTEGER NULL, `appliesTo` JSON NOT NULL,
  `startsAt` DATETIME(3) NULL, `expiresAt` DATETIME(3) NULL,
  `visibleOnWebsite` BOOLEAN NOT NULL DEFAULT false, `visibleInApp` BOOLEAN NOT NULL DEFAULT false,
  `systemLimit` INTEGER NULL, `perUserLimit` INTEGER NULL,
  `status` ENUM('DRAFT','ACTIVE','EXPIRED','DISABLED') NOT NULL DEFAULT 'DRAFT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PromoCode_code_key`(`code`), INDEX `PromoCode_status_expiresAt_idx`(`status`,`expiresAt`),
  INDEX `PromoCode_startsAt_expiresAt_idx`(`startsAt`,`expiresAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromoRedemption` (
  `id` VARCHAR(191) NOT NULL, `promoCodeId` VARCHAR(191) NOT NULL, `orderId` VARCHAR(191) NOT NULL,
  `learnerId` VARCHAR(191) NOT NULL, `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PromoRedemption_promoCodeId_orderId_key`(`promoCodeId`,`orderId`),
  INDEX `PromoRedemption_learnerId_redeemedAt_idx`(`learnerId`,`redeemedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReferralCode` (
  `id` VARCHAR(191) NOT NULL, `learnerId` VARCHAR(191) NOT NULL, `code` VARCHAR(40) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ReferralCode_learnerId_key`(`learnerId`), UNIQUE INDEX `ReferralCode_code_key`(`code`),
  INDEX `ReferralCode_code_idx`(`code`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReferralTransaction` (
  `id` VARCHAR(191) NOT NULL, `referrerId` VARCHAR(191) NOT NULL, `refereeId` VARCHAR(191) NULL,
  `orderId` VARCHAR(191) NULL, `creditMinor` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('PENDING','APPROVED','REJECTED','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ReferralTransaction_referrerId_status_idx`(`referrerId`,`status`),
  INDEX `ReferralTransaction_refereeId_idx`(`refereeId`), INDEX `ReferralTransaction_orderId_idx`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CreditLedger` (
  `id` VARCHAR(191) NOT NULL, `learnerId` VARCHAR(191) NOT NULL, `creditMinor` INTEGER NOT NULL,
  `kind` VARCHAR(40) NOT NULL, `referenceId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CreditLedger_learnerId_createdAt_idx`(`learnerId`,`createdAt`),
  INDEX `CreditLedger_referenceId_idx`(`referenceId`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Cheque` (
  `id` VARCHAR(191) NOT NULL, `learnerName` VARCHAR(200) NOT NULL, `learnerId` VARCHAR(191) NULL,
  `parentName` VARCHAR(200) NULL, `bank` VARCHAR(200) NOT NULL, `chequeNo` VARCHAR(40) NOT NULL,
  `amountMinor` INTEGER NOT NULL, `chequeDate` DATE NOT NULL,
  `status` ENUM('RECEIVED','DEPOSITED','CLEARED','BOUNCED','CANCELLED') NOT NULL DEFAULT 'RECEIVED',
  `orderId` VARCHAR(191) NULL, `remark` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Cheque_learnerId_idx`(`learnerId`), INDEX `Cheque_status_chequeDate_idx`(`status`,`chequeDate`),
  INDEX `Cheque_bank_chequeNo_idx`(`bank`,`chequeNo`), INDEX `Cheque_orderId_idx`(`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChequeStatusHistory` (
  `id` VARCHAR(191) NOT NULL, `chequeId` VARCHAR(191) NOT NULL,
  `fromStatus` ENUM('RECEIVED','DEPOSITED','CLEARED','BOUNCED','CANCELLED') NULL,
  `toStatus` ENUM('RECEIVED','DEPOSITED','CLEARED','BOUNCED','CANCELLED') NOT NULL,
  `remark` TEXT NOT NULL, `changedById` VARCHAR(191) NOT NULL,
  `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ChequeStatusHistory_chequeId_changedAt_idx`(`chequeId`,`changedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AbandonedCart` (
  `id` VARCHAR(191) NOT NULL, `learnerId` VARCHAR(191) NULL, `email` VARCHAR(254) NULL,
  `itemsJson` JSON NOT NULL, `subtotalMinor` INTEGER NOT NULL DEFAULT 0,
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `recoveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `AbandonedCart_learnerId_lastSeenAt_idx`(`learnerId`,`lastSeenAt`),
  INDEX `AbandonedCart_email_lastSeenAt_idx`(`email`,`lastSeenAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Enrolment` ADD INDEX `Enrolment_orderId_idx`(`orderId`);
ALTER TABLE `Order` ADD CONSTRAINT `Order_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `PromoCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PaymentEvent` ADD CONSTRAINT `PaymentEvent_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `MembershipPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PromoRedemption` ADD CONSTRAINT `PromoRedemption_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `PromoCode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PromoRedemption` ADD CONSTRAINT `PromoRedemption_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PromoRedemption` ADD CONSTRAINT `PromoRedemption_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReferralCode` ADD CONSTRAINT `ReferralCode_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_refereeId_fkey` FOREIGN KEY (`refereeId`) REFERENCES `LearnerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CreditLedger` ADD CONSTRAINT `CreditLedger_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ChequeStatusHistory` ADD CONSTRAINT `ChequeStatusHistory_chequeId_fkey` FOREIGN KEY (`chequeId`) REFERENCES `Cheque`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AbandonedCart` ADD CONSTRAINT `AbandonedCart_learnerId_fkey` FOREIGN KEY (`learnerId`) REFERENCES `LearnerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Enrolment` ADD CONSTRAINT `Enrolment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
