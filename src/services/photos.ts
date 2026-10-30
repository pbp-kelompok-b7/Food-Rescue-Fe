export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export function photoError(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Gunakan foto JPG, PNG, atau WebP.'
  if (file.size > MAX_PHOTO_BYTES) return 'Ukuran foto maksimal 5 MB.'
}

export function photoBody<T extends object>(body: T, image?: File | null): T | FormData {
  if (image === undefined) return body
  if (image === null) return { ...body, image: null }
  const data = new FormData()
  data.set('payload', JSON.stringify(body))
  data.set('image', image)
  return data
}

export function photoUrl(path: string) {
  const base = import.meta.env?.VITE_API_BASE_URL || '/api/v1'
  return /^https?:\/\//.test(base) ? new URL(path, base).href : path
}
