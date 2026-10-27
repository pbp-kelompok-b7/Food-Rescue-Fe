import { ApiError } from '../../services/api.ts'
import type { Listing } from '../../services/listings.ts'

const labels: Record<string, string> = {
  PACKAGED_FOOD_SURPLUS: 'Makanan kemasan', COMPOSTABLE_FOOD_WASTE: 'Sisa organik',
  HUMAN_CONSUMPTION: 'Konsumsi manusia', ANIMAL_FEED: 'Pakan hewan', COMPOSTING: 'Kompos', BSF: 'Pakan maggot (BSF)', UPCYCLING: 'Olahan kembali',
  DONATE: 'Donasi', SELL: 'Jual', AVAILABLE: 'Tersedia', RESERVED: 'Direservasi', ALLOCATED: 'Dialokasikan',
  COMPLETED: 'Selesai', EXPIRED: 'Kedaluwarsa', CLOSED: 'Ditutup',
}
export const supplyLabel = (value: string) => labels[value] || value.replaceAll('_', ' ')
export const quantityText = (value: string | number) => String(value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
export const priceText = (value: string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value))
export function deadlineText(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date)} WIB` : 'Waktu tidak tersedia'
}
export function claimable(listing: Listing, now = Date.now()) {
  return listing.status === 'AVAILABLE' && !listing.archived_at && Number(listing.quantity_available) > 0 && Date.parse(listing.available_until) > now
}
export function supplyError(error: unknown) {
  if (error instanceof RangeError) return 'ID supply tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Periksa kembali pencarian atau data yang kamu masukkan.'
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return error.errors.some(item => item.code === 'csrf_failed') ? 'Verifikasi keamanan gagal. Coba kirim kembali.' : 'Kamu tidak memiliki izin untuk melakukan tindakan ini.'
    if (error.status === 404) return 'Supply tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 409) {
      if (error.errors.some(item => item.code === 'quantity_floor')) return 'Jumlah tidak boleh kurang dari resource yang sudah dialokasikan atau diselesaikan.'
      if (error.errors.some(item => item.code === 'unit_locked')) return 'Jenis, kategori, dan satuan tidak dapat diubah setelah ada reservasi.'
      return 'Supply sudah berubah. Periksa data terbaru sebelum menyimpan kembali.'
    }
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan supply belum tersedia. Coba lagi nanti.'
  }
  return 'Supply belum dapat diproses. Periksa koneksi dan coba lagi.'
}
