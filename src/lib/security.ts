/**
 * Validates a user-supplied redirect path to prevent open redirects.
 * Only same-origin absolute paths are allowed: the value must start with
 * a single '/' and must not start with '//' or '/\' (browsers treat both
 * as protocol-relative URLs). Falls back to '/' for anything else.
 */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/')) {
    return '/'
  }
  if (path.startsWith('//') || path.startsWith('/\\')) {
    return '/'
  }
  return path
}
