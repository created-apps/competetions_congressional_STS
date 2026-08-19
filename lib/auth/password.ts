import "server-only"
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64
const SALT_BYTES = 16

/**
 * Hashes a password with scrypt and a random per-user salt.
 * Format: `scrypt$<saltHex>$<hashHex>`. No external dependency required.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex")
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt}$${derived.toString("hex")}`
}

/**
 * Verifies a password against a stored `scrypt$salt$hash` string using a
 * constant-time comparison. Returns false for malformed input.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false

  const [, salt, hashHex] = parts
  const expected = Buffer.from(hashHex, "hex")
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer

  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
