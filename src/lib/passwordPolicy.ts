export const PASSWORD_REQUIREMENTS_TEXT =
  'At least 8 characters, with one uppercase letter, one number, and one special character.'

export interface PasswordRequirement {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

/** Returns an error message if the password fails the policy, or null if it passes. */
export function validatePassword(password: string): string | null {
  const failed = PASSWORD_REQUIREMENTS.find((r) => !r.test(password))
  if (!failed) return null
  return `Password must include: ${failed.label.toLowerCase()}.`
}
