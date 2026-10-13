import { supabase } from '@/lib/supabase'

const BUCKET = 'avatars'
const SIZE = 512
const MAX_INPUT_BYTES = 15 * 1024 * 1024

/**
 * Center-crops the picked image to a square and scales it to 512px JPEG, so a
 * 6 MB phone photo uploads as ~60 KB and always fits the bucket's 2 MB cap.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("That file couldn't be read as an image. Use a JPG, PNG or WebP photo.")
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the image.')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Your browser could not process the image.'))), 'image/jpeg', 0.85),
  )
}

/** Uploads a new profile photo for the user and returns its public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG or WebP).')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is over 15 MB. Choose a smaller photo.')

  const blob = await toSquareJpeg(file)
  // A fresh name per upload, so browsers and the CDN never serve the old photo.
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Deletes the user's uploaded photos other than the one now on their profile.
 * Best-effort: a leftover file costs a few KB, so failures are ignored.
 */
export async function removeOtherAvatars(userId: string, keepUrl: string | null): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list(userId)
  const stale = (data ?? [])
    .map((f) => `${userId}/${f.name}`)
    .filter((path) => !keepUrl || !keepUrl.endsWith(`/${BUCKET}/${path}`))
  if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale)
}
