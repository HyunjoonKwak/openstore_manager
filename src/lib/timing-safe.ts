import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Both inputs are hashed with SHA-256 first, so inputs of different
 * lengths can be compared safely (crypto.timingSafeEqual requires
 * equal-length buffers) without leaking length information.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}
