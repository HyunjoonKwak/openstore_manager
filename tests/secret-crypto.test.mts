import assert from 'node:assert/strict'
import { test } from 'node:test'

// Key must be set before importing so all crypto paths are active
const TEST_KEY = 'a'.repeat(64)
process.env.SECRETS_ENCRYPTION_KEY = TEST_KEY

const {
  ENCRYPTED_SECRET_PREFIX,
  SECRET_API_CONFIG_FIELDS,
  isEncryptedSecret,
  encryptSecret,
  decryptSecret,
  encryptApiConfigSecrets,
  decryptApiConfigSecrets,
} = await import('../src/lib/secret-crypto.ts')

test('encryptSecret/decryptSecret roundtrip restores the original value', () => {
  const plain = 'sk-super-secret-openai-key-1234'
  const encrypted = encryptSecret(plain)

  assert.ok(encrypted.startsWith(ENCRYPTED_SECRET_PREFIX))
  assert.notEqual(encrypted, plain)
  assert.equal(encrypted.split(':').length, 5) // enc:v1:<iv>:<tag>:<ct>
  assert.equal(decryptSecret(encrypted), plain)
})

test('encryptSecret uses a random IV so identical inputs produce different ciphertext', () => {
  const plain = 'same-secret'
  const first = encryptSecret(plain)
  const second = encryptSecret(plain)

  assert.notEqual(first, second)
  assert.equal(decryptSecret(first), plain)
  assert.equal(decryptSecret(second), plain)
})

test('encryptSecret leaves empty and already-encrypted values unchanged', () => {
  assert.equal(encryptSecret(''), '')
  const encrypted = encryptSecret('value')
  assert.equal(encryptSecret(encrypted), encrypted)
})

test('decryptSecret passes legacy plaintext through unchanged', () => {
  assert.equal(decryptSecret('legacy-plaintext-secret'), 'legacy-plaintext-secret')
  assert.equal(decryptSecret(''), '')
  assert.equal(isEncryptedSecret('legacy-plaintext-secret'), false)
})

test('decryptSecret throws on tampered ciphertext', () => {
  const encrypted = encryptSecret('tamper-target')
  const parts = encrypted.split(':')
  const ciphertext = Buffer.from(parts[4], 'base64')
  ciphertext[0] = ciphertext[0] ^ 0xff
  const tampered = [...parts.slice(0, 4), ciphertext.toString('base64')].join(':')

  const originalConsoleError = console.error
  console.error = () => {}
  try {
    assert.throws(() => decryptSecret(tampered), /Failed to decrypt stored secret/)
    assert.throws(
      () => decryptSecret(`${ENCRYPTED_SECRET_PREFIX}not-a-valid-payload`),
      /invalid encrypted format/
    )
  } finally {
    console.error = originalConsoleError
  }
})

test('missing key: encryptSecret passes plaintext through, decryptSecret of enc value throws', () => {
  const encrypted = encryptSecret('secret-before-key-removal')
  const originalConsoleError = console.error
  let warnings = 0
  console.error = () => {
    warnings += 1
  }
  delete process.env.SECRETS_ENCRYPTION_KEY

  try {
    // Writes keep working without the key (plaintext passthrough, one-time warning)
    assert.equal(encryptSecret('plain-secret'), 'plain-secret')
    encryptSecret('another-plain-secret')
    assert.equal(warnings, 1)

    // Legacy plaintext reads keep working without the key
    assert.equal(decryptSecret('legacy-plaintext'), 'legacy-plaintext')

    // Encrypted values cannot be decrypted without the key
    assert.throws(() => decryptSecret(encrypted), /SECRETS_ENCRYPTION_KEY is not configured/)
  } finally {
    process.env.SECRETS_ENCRYPTION_KEY = TEST_KEY
    console.error = originalConsoleError
  }
})

test('invalid key format throws a clear configuration error', () => {
  process.env.SECRETS_ENCRYPTION_KEY = 'not-hex'
  try {
    assert.throws(() => encryptSecret('value'), /64 hex characters/)
  } finally {
    process.env.SECRETS_ENCRYPTION_KEY = TEST_KEY
  }
})

test('encryptApiConfigSecrets only touches secret fields and never mutates input', () => {
  const config = {
    naverClientId: 'client-id',
    naverClientSecret: 'naver-secret',
    naverApiHubClientId: 'hub-client-id',
    naverApiHubClientSecret: 'hub-secret',
    openaiApiKey: 'sk-openai',
    hanjinApiKey: 'hanjin-key',
    hanjinApiSecret: 'hanjin-secret',
    coupangSecretKey: 'coupang-secret',
    storeUrl: 'https://smartstore.naver.com/my-store',
    deliveryCheckTimes: [9, 15, 21],
    deliveryCheckEnabled: true,
  }
  const snapshot = structuredClone(config)

  const encrypted = encryptApiConfigSecrets(config)

  // Immutability: new object returned, input untouched
  assert.notEqual(encrypted, config)
  assert.deepEqual(config, snapshot)

  // Non-secret fields stay plaintext
  assert.equal(encrypted.naverClientId, 'client-id')
  assert.equal(encrypted.naverApiHubClientId, 'hub-client-id')
  assert.equal(encrypted.storeUrl, 'https://smartstore.naver.com/my-store')
  assert.deepEqual(encrypted.deliveryCheckTimes, [9, 15, 21])
  assert.equal(encrypted.deliveryCheckEnabled, true)

  // All secret fields are encrypted
  for (const field of SECRET_API_CONFIG_FIELDS) {
    assert.ok(isEncryptedSecret(encrypted[field]), `${field} should be encrypted`)
  }

  // Decryption restores the original config values
  const decrypted = decryptApiConfigSecrets(encrypted)
  assert.notEqual(decrypted, encrypted)
  assert.deepEqual(decrypted, snapshot)
})

test('config helpers tolerate missing, empty, and non-object values', () => {
  assert.equal(encryptApiConfigSecrets(null), null)
  assert.equal(decryptApiConfigSecrets(null), null)
  assert.deepEqual(encryptApiConfigSecrets({}), {})

  const partial = { naverClientId: 'only-id', openaiApiKey: '' }
  const encrypted = encryptApiConfigSecrets(partial)
  assert.deepEqual(encrypted, partial)
  assert.notEqual(encrypted, partial)
})
