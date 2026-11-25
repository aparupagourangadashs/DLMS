import { writeAudit } from "@/server/audit";
import { burnPasswordTime, hashPassword, verifyPassword } from "@/server/auth/password";
import type { AnyRole } from "@/server/auth/permissions";
import { createToken, hashToken, normalizeEmail, sha256 } from "@/server/auth/tokens";
import { prisma } from "@/server/db";
import { BusinessRule, ValidationError } from "@/server/http/errors";
import { sendEmail, siteUrl } from "@/server/notify/email";
import { nextRegistrationNo } from "./registration";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
const HOUR = 60 * 60 * 1000;
export const VERIFY_TTL_MS = 24 * HOUR;
export const RESET_TTL_MS = HOUR;
export const INVITE_TTL_MS = 48 * HOUR;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: AnyRole;
  kind: "STAFF" | "LEARNER";
  tokenVersion: number;
};

export type AuthFailureCode = "invalid" | "not_verified";

export class AuthFailure extends Error {
  constructor(readonly code: AuthFailureCode) {
    super(code);
    this.name = "AuthFailure";
  }
}

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

/** Verifies credentials with lockout. Failures never reveal whether the account exists or is locked. */
export async function authenticate(emailInput: string, password: string, ip?: string): Promise<AuthenticatedUser> {
  const email = normalizeEmail(emailInput);
  const identifier = sha256(email);
  const ipHash = ip ? sha256(ip) : null;
  const record = async (success: boolean) => {
    await prisma.loginAttempt.create({ data: { identifier, ipHash, success } });
  };

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staffProfile: { select: { displayName: true } }, learnerProfile: { select: { name: true } } },
  });

  if (!user || !user.passwordHash) {
    await burnPasswordTime(password);
    await record(false);
    throw new AuthFailure("invalid");
  }

  const locked = user.lockedUntil !== null && user.lockedUntil > new Date();
  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (locked || !passwordOk || user.status !== "ACTIVE") {
    if (!locked && !passwordOk) {
      const failedLogins = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: failedLogins >= MAX_FAILED_LOGINS ? { failedLogins: 0, lockedUntil: minutesFromNow(LOCK_MINUTES) } : { failedLogins },
      });
    }
    await record(false);
    throw new AuthFailure("invalid");
  }

  if (user.kind === "LEARNER" && !user.emailVerifiedAt) {
    await record(false);
    throw new AuthFailure("not_verified");
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await record(true);
  return {
    id: user.id,
    email: user.email,
    name: user.staffProfile?.displayName ?? user.learnerProfile?.name ?? user.email,
    role: user.role,
    kind: user.kind,
    tokenVersion: user.tokenVersion,
  };
}

async function issueEmailToken(kind: "verify" | "reset", userId: string, ttlMs: number) {
  const { token, hash } = createToken();
  const data = { userId, tokenHash: hash, expiresAt: new Date(Date.now() + ttlMs) };
  if (kind === "verify") await prisma.emailVerificationToken.create({ data });
  else await prisma.passwordResetToken.create({ data });
  return token;
}

export async function sendVerificationEmail(userId: string, email: string, name: string) {
  const token = await issueEmailToken("verify", userId, VERIFY_TTL_MS);
  await sendEmail({
    to: email,
    subject: "Verify your email address",
    text: `Hello ${name},\n\nConfirm your email to activate your account:\n${siteUrl()}/verify-email?token=${token}\n\nThis link expires in 24 hours. If you did not sign up, ignore this message.`,
  });
}

/** Used for staff invitations and for the forgot-password flow. */
export async function sendPasswordSetupEmail(userId: string, email: string, kind: "reset" | "invite") {
  const token = await issueEmailToken("reset", userId, kind === "invite" ? INVITE_TTL_MS : RESET_TTL_MS);
  const link = `${siteUrl()}/reset-password?token=${token}`;
  await sendEmail(
    kind === "invite"
      ? { to: email, subject: "Set up your IBMV account", text: `An account was created for you. Choose your password here:\n${link}\n\nThis link expires in 48 hours.` }
      : { to: email, subject: "Reset your password", text: `Choose a new password here:\n${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this message.` },
  );
}

export type RegisterInput = { name: string; email: string; password: string };

/** Always completes quietly so callers cannot learn whether an address is already registered. */
export async function registerLearner(input: RegisterInput, ip?: string) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await burnPasswordTime(input.password);
    return;
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) =>
    tx.user.create({
      data: {
        email,
        passwordHash,
        kind: "LEARNER",
        role: "LEARNER",
        learnerProfile: { create: { name: input.name.trim(), registrationNo: await nextRegistrationNo(tx) } },
      },
    }),
  );
  await writeAudit({ actorId: user.id, action: "learner.register", entity: "User", entityId: user.id, ip });
  await sendVerificationEmail(user.id, email, input.name.trim());
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new BusinessRule("This verification link is invalid or has expired.");
  }
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
}

export async function requestPasswordReset(emailInput: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(emailInput) }, select: { id: true, email: true, status: true } });
  if (user && user.status === "ACTIVE") await sendPasswordSetupEmail(user.id, user.email, "reset");
}

export async function resetPassword(token: string, newPassword: string, ip?: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new BusinessRule("This reset link is invalid or has expired.");
  }
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        failedLogins: 0,
        lockedUntil: null,
        emailVerifiedAt: now,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } }),
  ]);
  await writeAudit({ actorId: record.userId, action: "user.password_reset", entity: "User", entityId: record.userId, ip });
}

export async function changePassword(userId: string, current: string, next: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await verifyPassword(current, user.passwordHash))) {
    throw new ValidationError({ currentPassword: "Current password is incorrect." });
  }
  if (current === next) throw new ValidationError({ newPassword: "Choose a different password." });
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next), tokenVersion: { increment: 1 } },
  });
  await writeAudit({ actorId: userId, action: "user.password_change", entity: "User", entityId: userId, ip });
}
