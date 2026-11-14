import { createHash, randomBytes, randomUUID } from "node:crypto";
import argon2 from "argon2";

export { randomUUID };

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  if (!passwordHash.startsWith("$argon2")) return false;
  return argon2.verify(passwordHash, password);
}
