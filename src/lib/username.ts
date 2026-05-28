const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username))
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username)
  if (!normalized) return 'Username is required'
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username must be 3–30 characters: lowercase letters, numbers, and underscores only'
  }
  return null
}

export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@')
}
