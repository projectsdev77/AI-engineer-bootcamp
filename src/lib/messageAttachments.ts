import { supabase } from '@/lib/supabase'
import type { MessageAttachment } from '@/types/database'

const BUCKET = 'message-attachments'
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS = 5

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
// Code and text files are stored as text/plain whatever the browser calls
// them (.py is often reported as '' or text/x-python), so the bucket's type
// allowlist stays short and nothing uploaded is ever served as HTML.
const TEXT_EXTENSIONS = [
  'txt', 'md', 'py', 'ipynb', 'js', 'jsx', 'ts', 'tsx', 'json', 'csv', 'yaml', 'yml', 'toml',
  'sql', 'sh', 'html', 'css', 'log', 'r', 'java', 'go', 'rs', 'c', 'cpp', 'h',
]

/** The accept attribute for the file picker. */
export const ATTACHMENT_ACCEPT = [...IMAGE_TYPES, 'application/pdf', ...TEXT_EXTENSIONS.map((e) => `.${e}`)].join(',')

function storedType(file: File): string | null {
  if (IMAGE_TYPES.includes(file.type) || file.type === 'application/pdf') return file.type
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  return TEXT_EXTENSIONS.includes(ext) ? 'text/plain' : null
}

export function isImage(a: MessageAttachment) {
  return IMAGE_TYPES.includes(a.type)
}

/** Returns an error message, or null when the file can be attached. */
export function validateAttachment(file: File): string | null {
  if (!storedType(file)) return `${file.name}: only images, PDFs and text or code files can be attached.`
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} is over 10 MB.`
  return null
}

export async function uploadAttachments(ticketId: string, files: File[]): Promise<MessageAttachment[]> {
  return Promise.all(
    files.map(async (file) => {
      const type = storedType(file) ?? 'text/plain'
      const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80) || 'file'
      const path = `${ticketId}/${crypto.randomUUID()}-${safeName}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: type })
      if (error) throw new Error(`Couldn't upload ${file.name}: ${error.message}`)
      return { path, name: file.name, size: file.size, type }
    }),
  )
}

/** Short-lived links for displaying/downloading private attachments. */
export async function signAttachmentUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60)
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl)
  }
  return map
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
