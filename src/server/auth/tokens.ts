import { createHash, randomBytes } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** The raw token goes to the user; only its hash is stored. */
export function createToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export function hashToken(token: string) {
  return sha256(token);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
