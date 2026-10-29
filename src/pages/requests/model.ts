import { ApiError } from '../../services/api.ts'
import type { ResourceRequest } from '../../services/requests.ts'

const labels: Record<string, string> = {
  PACKAGED_FOOD_SURPLUS: 'Makanan kemasan', COMPOSTABLE_FOOD_WASTE: 'Bahan organik',
  HUMAN_CONSUMPTION: 'Konsumsi manusia', ANIMAL_FEED: 'Pakan hewan', COMPOSTING: 'Kompos', BSF: 'Pakan maggot (BSF)', UPCYCLING: 'Olahan kembali',
  OPEN: 'Terbuka', ALLOCATED: 'Dialokasikan', FULFILLED: 'Terpenuhi', CLOSED: 'Ditutup', EXPIRED: 'Kedaluwarsa',
}
export const requestLabel = (value: string) => labels[value] || value.replaceAll('_', ' ')
export const quantityText = (value: string) => value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
export function deadlineText(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date)} WIB` : 'Waktu tidak tersedia'
}
export function budgetText(request: ResourceRequest) {
  if (request.donate_only) return 'Hanya menerima donasi'
  if (request.max_unit_price === null) return 'Menerima donasi atau penawaran berbayar · Tanpa batas harga'
  const price = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(request.max_unit_price))
  return `Menerima donasi atau penawaran berbayar · Maksimal ${price} / ${request.unit}`
}
export function acceptingOffers(request: ResourceRequest, now = Date.now()) {
  return request.status === 'OPEN' && !request.archived_at && Number(request.quantity_remaining) > 0 && Date.parse(request.valid_until) > now
}
export function requestError(error: unknown) {
  if (error instanceof RangeError) return 'ID request tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Periksa kembali parameter pencarian atau ID request.'
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return 'Kamu tidak memiliki izin untuk melihat request ini.'
    if (error.status === 404) return error.errors.some(item => item.code === 'page_not_found') ? 'Halaman hasil tidak ditemukan. Reset pencarian untuk kembali ke halaman pertama.' : 'Request tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan Request Board belum tersedia. Coba lagi nanti.'
  }
  return 'Request belum dapat dimuat. Periksa koneksi dan coba lagi.'
}
