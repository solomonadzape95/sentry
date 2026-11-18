import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque single-use tokens for invitations and password resets. Only the hash
 * is stored; the raw token appears once in the link.
 */
export function createOpaqueToken(bytes = 32): { token: string; hash: string } {
  const token = randomBytes(bytes).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;
