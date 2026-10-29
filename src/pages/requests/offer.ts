import { ApiError } from '../../services/api.ts'
import type { ApiPayload } from '../../services/types.ts'
import type { ResourceRequest } from '../../services/requests.ts'
import type { LocationResult, ReferenceData } from '../../services/reference.ts'
import { locationPayload } from '../../services/reference.ts'
import { decimalError, toJakartaTimestamp } from '../../components/resources/resourceFields.ts'
import { deadlineText, makeLabeller, priceText, quantityText } from '../../services/format.ts'

export { deadlineText, priceText, quantityText }
export const offerLabel = makeLabeller({
  OPEN: 'Terbuka', ALLOCATED: 'Dialokasikan', FULFILLED: 'Terpenuhi', CLOSED: 'Ditutup', EXPIRED: 'Kedaluwarsa',
})

// A request accepts new offers only while OPEN, not archived, with remaining
// need, and before valid_until (contract 7.3.1 / 7.4.2).
export function offerable(request: ResourceRequest, now = Date.now()) {
  return request.status === 'OPEN' && !request.archived_at && Number(request.quantity_remaining) > 0 && Date.parse(request.valid_until) > now
}

export interface OfferValues {
  title: string
  description: string
  condition: string
  quantity: string
  mode: 'DONATE' | 'SELL'
  unit_price: string
  deadline: string
  location: LocationResult | null
  storage_notes: string
  allergen_notes: string
  packaging_status: string
}
export function emptyOffer(): OfferValues {
  // donate_only requests force DONATE; otherwise default to DONATE and let the
  // provider switch to SELL (price capped by max_unit_price).
  return { title: '', description: '', condition: '', quantity: '', mode: 'DONATE', unit_price: '0.00', deadline: '', location: null, storage_notes: '', allergen_notes: '', packaging_status: '' }
}

// Validate against unit precision (from the request's unit), remaining need,
// price/mode rules, and the required text/location/deadline. The backend
// re-checks everything on submit and remains the source of truth.
export function validateOffer(value: OfferValues, request: ResourceRequest, data: ReferenceData, now = Date.now()): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [field, max] of [['title', 200], ['description', 5000], ['condition', 1000]] as const) {
    if (!value[field].trim()) errors[field] = 'Isi informasi ini.'
    else if (value[field].trim().length > max) errors[field] = 'Informasi terlalu panjang.'
  }
  for (const [field, max] of [['storage_notes', 2000], ['allergen_notes', 2000], ['packaging_status', 200]] as const) if (value[field].trim().length > max) errors[field] = 'Informasi terlalu panjang.'
  const unit = data.units.find(item => item.code === request.unit)
  const quantityMessage = decimalError(value.quantity, unit ? (unit.allows_decimal ? unit.max_decimal_places : 0) : 0, false, 9)
  if (quantityMessage) errors.quantity = quantityMessage
  else if (Number(value.quantity) > Number(request.quantity_remaining)) errors.quantity = `Maksimal ${quantityText(request.quantity_remaining)} ${request.unit} tersisa.`
  // Price / mode: donate-only forbids SELL; DONATE must be zero; SELL must be
  // positive and not exceed the request's max_unit_price.
  if (request.donate_only && value.mode === 'SELL') errors.mode = 'Request ini hanya menerima donasi.'
  if (value.mode === 'SELL') {
    const priceMessage = decimalError(value.unit_price, 2)
    if (priceMessage) errors.unit_price = priceMessage
    else if (request.max_unit_price !== null && Number(value.unit_price) > Number(request.max_unit_price)) errors.unit_price = `Harga per ${request.unit} tidak boleh melebihi ${priceText(request.max_unit_price)}.`
  } else if (value.unit_price !== '0.00') errors.unit_price = 'Harga donasi harus nol.'
  const deadline = toJakartaTimestamp(value.deadline)
  if (!deadline || new Date(deadline).getTime() <= now) errors.deadline = 'Pilih waktu yang valid di masa depan.'
  const location = value.location
  if (!location || !location.label.trim() || location.label.length > 300 || !location.area.trim() || location.area.length > 100 || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) errors.location = 'Cari dan pilih lokasi resource yang valid.'
  return errors
}

// Build the offer payload. type/category/unit/intended_use are inherited from
// the request (never chosen by the provider); suitability carries the request's
// intended_use (contract 7.4.2). listing_id is never sent.
export function offerPayload(value: OfferValues, request: ResourceRequest): ApiPayload {
  return {
    resource_type: request.resource_type,
    title: value.title.trim(),
    category: request.category,
    description: value.description.trim(),
    unit: request.unit,
    mode: value.mode,
    unit_price: value.mode === 'DONATE' ? '0.00' : value.unit_price,
    condition: value.condition.trim(),
    suitability: [request.intended_use],
    location: locationPayload(value.location!),
    storage_notes: value.storage_notes.trim() || null,
    allergen_notes: value.allergen_notes.trim() || null,
    packaging_status: value.packaging_status.trim() || null,
    quantity: value.quantity,
    resource_deadline: toJakartaTimestamp(value.deadline)!,
  }
}

export function offerError(error: unknown): string {
  if (error instanceof RangeError) return 'ID request tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Periksa kembali data penawaran yang kamu masukkan.'
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return error.errors.some(item => item.code === 'csrf_failed') ? 'Verifikasi keamanan gagal. Coba kirim kembali.' : 'Kamu tidak dapat menawarkan resource untuk request ini.'
    if (error.status === 404) return 'Request tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 409) {
      if (error.errors.some(item => item.code === 'self_transaction')) return 'Kamu tidak dapat menawarkan resource untuk request milikmu sendiri.'
      if (error.errors.some(item => item.code === 'source_not_accepting')) return 'Request ini sudah tidak menerima penawaran. Muat ulang untuk melihat status terbaru.'
      if (error.errors.some(item => item.code === 'terms_mismatch')) return 'Detail penawaran tidak sesuai dengan kebutuhan request. Periksa jumlah, satuan, peruntukan, atau harga.'
      if (error.errors.some(item => item.code === 'insufficient_quantity')) return 'Jumlah melebihi sisa kebutuhan. Muat ulang lalu sesuaikan jumlahnya.'
      return 'Request sudah berubah. Periksa data terbaru sebelum menawarkan kembali.'
    }
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan penawaran belum tersedia. Coba lagi nanti.'
  }
  return 'Penawaran belum dapat diproses. Periksa koneksi dan coba lagi.'
}

// Map backend field errors to the form's fields (contract §9). resource_deadline
// maps to the deadline control; other fields pass through by name.
export function offerFieldErrors(error: unknown): Record<string, string> {
  const mapped: Record<string, string> = {}
  if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
    const aliases: Record<string, string> = { resource_deadline: 'deadline', 'location.label': 'location', 'location.area': 'location', 'location.latitude': 'location', 'location.longitude': 'location' }
    const known = new Set(['title', 'description', 'condition', 'quantity', 'mode', 'unit_price', 'deadline', 'location', 'storage_notes', 'allergen_notes', 'packaging_status'])
    for (const item of error.errors) {
      const key = item.field && (aliases[item.field] || item.field)
      if (key && known.has(key) && typeof item.message === 'string') mapped[key] = item.message.slice(0, 300)
    }
  }
  return mapped
}
