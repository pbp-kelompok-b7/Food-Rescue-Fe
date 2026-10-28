import { ApiError } from '../../services/api.ts'
import type { Listing } from '../../services/listings.ts'
import type { ReferenceData, ReferenceUnit } from '../../services/reference.ts'
import { decimalError } from '../../components/resources/resourceFields.ts'
import { quantityText } from './model.ts'

// Resolve the precision rules for the listing's unit from reference data.
// Falls back to whole numbers when the unit is not in the catalogue.
export function unitPrecision(data: ReferenceData, unit: string): Pick<ReferenceUnit, 'allows_decimal' | 'max_decimal_places'> {
  const match = data.units.find(item => item.code === unit)
  return match ? { allows_decimal: match.allows_decimal, max_decimal_places: match.max_decimal_places } : { allows_decimal: false, max_decimal_places: 0 }
}

export const claimStep = (unit: ReturnType<typeof unitPrecision>) => (unit.allows_decimal && unit.max_decimal_places > 0 ? 10 ** -unit.max_decimal_places : 1)

// Validate the requested quantity against unit precision and the available
// stock at view time. The backend remains the source of truth (it re-checks on
// submit), but this gives immediate feedback and disables an impossible submit.
export function validateClaimQuantity(value: string, listing: Listing, data: ReferenceData): string | undefined {
  const unit = unitPrecision(data, listing.unit)
  const message = decimalError(value, unit.allows_decimal ? unit.max_decimal_places : 0, false, 9)
  if (message) return message
  if (Number(value) > Number(listing.quantity_available)) return `Maksimal ${quantityText(listing.quantity_available)} ${listing.unit} tersedia.`
}

// Error copy for a claim submission. Shares the shape of supplyError but covers
// the claim-specific 409 codes (contract 7.4.1 and §9 error catalogue).
export function claimError(error: unknown): string {
  if (error instanceof RangeError) return 'ID supply tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Periksa kembali jumlah yang kamu masukkan.'
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return error.errors.some(item => item.code === 'csrf_failed') ? 'Verifikasi keamanan gagal. Coba kirim kembali.' : 'Kamu tidak dapat mengajukan claim untuk supply ini.'
    if (error.status === 404) return 'Supply tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 409) {
      if (error.errors.some(item => item.code === 'self_transaction')) return 'Kamu tidak dapat mengajukan claim untuk supply milikmu sendiri.'
      if (error.errors.some(item => item.code === 'source_not_accepting')) return 'Supply ini sudah tidak menerima claim. Muat ulang untuk melihat status terbaru.'
      if (error.errors.some(item => item.code === 'insufficient_quantity')) return 'Jumlah melebihi yang tersedia. Muat ulang lalu sesuaikan jumlahnya.'
      return 'Supply sudah berubah. Periksa data terbaru sebelum mengajukan kembali.'
    }
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan claim belum tersedia. Coba lagi nanti.'
  }
  return 'Claim belum dapat diproses. Periksa koneksi dan coba lagi.'
}

// Map a claim server error to an inline message on the quantity field, when the
// server attributed the error to quantity (contract 7.4.1 / §9).
export function claimFieldError(error: unknown): string | undefined {
  if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
    const item = error.errors.find(entry => entry.field === 'quantity' && typeof entry.message === 'string')
    if (item) return item.message.slice(0, 300)
  }
}
