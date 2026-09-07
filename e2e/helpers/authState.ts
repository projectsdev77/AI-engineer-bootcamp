import path from 'node:path'

const AUTH_DIR = path.resolve(import.meta.dirname, '..', '.auth')

export const storageStatePath = {
  student: path.join(AUTH_DIR, 'student.json'),
  mentor: path.join(AUTH_DIR, 'mentor.json'),
  admin: path.join(AUTH_DIR, 'admin.json'),
} as const

export const authDir = AUTH_DIR
