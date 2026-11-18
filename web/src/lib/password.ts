import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing uses Node's built-in scrypt rather than a native bcrypt
 * dependency, so the demo runs on any machine without a compiler.
 *
 * Format: scrypt$N$r$p$salt$key (base64url).
 */
const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return [
    "scrypt",
    String(N),
    String(R),
    String(P),
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const keyLength = 64;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (!salt.length || expected.length !== keyLength) return false;

  const actual = await derive(password, salt, keyLength, {
    N: Number(parts[1]),
    r: Number(parts[2]),
    p: Number(parts[3]),
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const PASSWORD_MIN_LENGTH = 10;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}
