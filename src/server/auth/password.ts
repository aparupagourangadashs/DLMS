import bcrypt from "bcryptjs";
import { z } from "zod";

const COST = 12;

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number.");

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// A valid hash of a random value so unknown-user logins cost the same time as real ones.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-only", COST);

export function burnPasswordTime(password: string) {
  return bcrypt.compare(password, DUMMY_HASH);
}
