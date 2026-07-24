import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * At-rest encryption helpers for third-party secrets stored in the
 * stores.api_config JSON column. Secrets are encrypted with AES-256-GCM
 * using a server-only key so the browser anon client (RLS-scoped, but
 * readable by the owner's browser) only ever sees ciphertext.
 *
 * Stored format: enc:v1:<iv_b64>:<tag_b64>:<ct_b64>
 *
 * Backward compatibility:
 * - Legacy plaintext values pass through decryptSecret unchanged.
 * - If SECRETS_ENCRYPTION_KEY is missing, encryptSecret returns the
 *   plaintext unchanged (with a one-time warning) so existing
 *   deployments keep working until the key is provisioned.
 */

export const ENCRYPTED_SECRET_PREFIX = 'enc:v1:'

const KEY_ENV_NAME = 'SECRETS_ENCRYPTION_KEY'
const KEY_HEX_PATTERN = /^[0-9a-fA-F]{64}$/
const IV_LENGTH_BYTES = 12

/**
 * api_config fields that hold third-party secrets. Non-secret fields
 * (client ids, seller ids, store URLs, delivery-check settings) stay
 * plaintext so status displays and presence checks keep working.
 */
export const SECRET_API_CONFIG_FIELDS = [
  'naverClientSecret',
  'naverApiHubClientSecret',
  'openaiApiKey',
  'hanjinApiKey',
  'hanjinApiSecret',
] as const

export type SecretApiConfigField = (typeof SECRET_API_CONFIG_FIELDS)[number]

let missingKeyWarned = false

function readEncryptionKey(): Buffer | null {
  const hex = process.env[KEY_ENV_NAME]
  if (!hex) {
    return null
  }
  if (!KEY_HEX_PATTERN.test(hex)) {
    throw new Error(
      `${KEY_ENV_NAME} must be 64 hex characters (32 bytes). Generate one with: openssl rand -hex 32`
    )
  }
  return Buffer.from(hex, 'hex')
}

export function isEncryptedSecret(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_SECRET_PREFIX)
}

/**
 * Encrypts a plaintext secret for storage. Empty and already-encrypted
 * values are returned unchanged. When the key env is missing, returns
 * the plaintext unchanged so saves never fail on unconfigured servers.
 */
export function encryptSecret(plain: string): string {
  if (!plain || isEncryptedSecret(plain)) {
    return plain
  }

  const key = readEncryptionKey()
  if (!key) {
    if (!missingKeyWarned) {
      missingKeyWarned = true
      console.error(
        `[secret-crypto] ${KEY_ENV_NAME} is not configured; secrets will be stored in plaintext. ` +
          'Generate a key with: openssl rand -hex 32'
      )
    }
    return plain
  }

  const iv = randomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    `${ENCRYPTED_SECRET_PREFIX}${iv.toString('base64')}`,
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/**
 * Decrypts a stored secret. Legacy plaintext values (no enc:v1: prefix)
 * are returned unchanged. Throws when an encrypted value cannot be
 * decrypted (missing key, wrong key, or tampered ciphertext).
 */
export function decryptSecret(value: string): string {
  if (!isEncryptedSecret(value)) {
    return value
  }

  const key = readEncryptionKey()
  if (!key) {
    throw new Error(
      `Cannot decrypt stored secret: ${KEY_ENV_NAME} is not configured. ` +
        'Set the same key that was used to encrypt the value.'
    )
  }

  const parts = value.slice(ENCRYPTED_SECRET_PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Stored secret has an invalid encrypted format.')
  }

  try {
    const [iv, authTag, ciphertext] = parts.map(part => Buffer.from(part, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch (error) {
    console.error('[secret-crypto] Secret decryption failed:', error)
    throw new Error(
      'Failed to decrypt stored secret. The value may be corrupted or the encryption key may have changed.'
    )
  }
}

function mapSecretFields<T>(config: T, transform: (value: string) => string): T {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config
  }

  const source = config as Record<string, unknown>
  const next: Record<string, unknown> = { ...source }

  for (const field of SECRET_API_CONFIG_FIELDS) {
    const value = source[field]
    if (typeof value === 'string' && value.length > 0) {
      next[field] = transform(value)
    }
  }

  return next as T
}

/** Returns a new config object with secret fields encrypted for storage. */
export function encryptApiConfigSecrets<T>(config: T): T {
  return mapSecretFields(config, encryptSecret)
}

/** Returns a new config object with secret fields decrypted for server-side use. */
export function decryptApiConfigSecrets<T>(config: T): T {
  return mapSecretFields(config, decryptSecret)
}
