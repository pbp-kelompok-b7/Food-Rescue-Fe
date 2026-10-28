import { ApiError } from '../../services/api.ts'

const labels: Record<string, string> = {
  PACKAGED_FOOD_SURPLUS: 'Makanan kemasan', COMPOSTABLE_FOOD_WASTE: 'Sisa organik',
  HUMAN_CONSUMPTION: 'Konsumsi manusia', ANIMAL_FEED: 'Pakan hewan', COMPOSTING: 'Kompos', BSF: 'Pakan maggot (BSF)', UPCYCLING: 'Olahan kembali',
  DONATE: 'Donasi', SELL: 'Jual',
  PENDING: 'Menunggu persetujuan', ACCEPTED: 'Diterima', REJECTED: 'Ditolak', CANCELLED: 'Dibatalkan',
  LISTING_CLAIM: 'Claim listing', REQUEST_OFFER: 'Penawaran request',
}
export const reservationLabel = (value: string) => labels[value] || value.replaceAll('_', ' ')
export const quantityText = (value: string | number) => String(value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
export const priceText = (value: string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value))
export function deadlineText(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date)} WIB` : 'Waktu tidak tersedia'
}

export function reservationError(error: unknown): string {
  if (error instanceof RangeError) return 'ID reservation tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return 'Kamu tidak memiliki akses ke reservation ini.'
    if (error.status === 404) return 'Reservation tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan reservation belum tersedia. Coba lagi nanti.'
  }
  return 'Reservation belum dapat dibuka. Periksa koneksi dan coba lagi.'
}
