import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Minimal .env file parser (dotenv is not installed in this project).
 * Supports KEY=VALUE lines, comments, and single/double quoted values.
 * Values are never logged anywhere.
 */
export function loadEnvFile(fileName = '.env.local'): Record<string, string> {
  const filePath = path.join(projectRoot, fileName)
  const content = fs.readFileSync(filePath, 'utf8')

  return content.split(/\r?\n/).reduce<Record<string, string>>((acc, rawLine) => {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) return acc

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) return acc

    const key = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue

    return { ...acc, [key]: value }
  }, {})
}

export function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing required environment variable "${key}" in .env.local`)
  }
  return value
}
