import { ApiError } from '../../services/api.ts'
import type { Listing, ListingWrite } from '../../services/listings.ts'
import type { LocationResult, ReferenceData } from '../../services/reference.ts'
import { locationPayload } from '../../services/reference.ts'
import { emptyResourceFields, toJakartaInput, toJakartaTimestamp, validateResourceFields, type ResourceFieldValues } from '../../components/resources/resourceFields.ts'

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
export interface SupplyValues {
  fields: ResourceFieldValues
  title: string
  description: string
  condition: string
  storage_notes: string
  allergen_notes: string
  packaging_status: string
  location: LocationResult | null
}
export const emptySupply: SupplyValues = {
  fields: { ...emptyResourceFields }, title: '', description: '', condition: '',
  storage_notes: '', allergen_notes: '', packaging_status: '', location: null,
}
export function listingValues(listing: Listing): SupplyValues {
  return {
    title: listing.title, description: listing.description, condition: listing.condition,
    storage_notes: listing.storage_notes || '', allergen_notes: listing.allergen_notes || '', packaging_status: listing.packaging_status || '',
    location: { ...listing.location, attribution: '' },
    fields: { ...emptyResourceFields, resource_type: listing.resource_type, category: listing.category, unit: listing.unit, suitability: [...listing.suitability], mode: listing.mode, unit_price: listing.unit_price, quantity: quantityText(listing.quantity_total), deadline: toJakartaInput(listing.available_until) },
  }
}
export function validateSupply(value: SupplyValues, data: ReferenceData, initial?: Listing): Record<string, string> {
  const errors = validateResourceFields(value.fields, data, 'supply')
  // Editing another field must preserve an unchanged (possibly expired) deadline.
  if (initial && value.fields.deadline === toJakartaInput(initial.available_until)) delete errors.deadline
  for (const [field, max] of [['title', 200], ['description', 5000], ['condition', 1000]] as const) {
    if (!value[field].trim()) errors[field] = 'Isi informasi ini.'
    else if (value[field].trim().length > max) errors[field] = 'Informasi terlalu panjang.'
  }
  for (const [field, max] of [['storage_notes', 2000], ['allergen_notes', 2000], ['packaging_status', 200]] as const) if (value[field].trim().length > max) errors[field] = 'Informasi terlalu panjang.'
  const location = value.location
  if (!location || !location.label.trim() || location.label.length > 300 || !location.area.trim() || location.area.length > 100 || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) errors.location = 'Cari dan pilih lokasi pickup yang valid.'
  return errors
}
export function supplyPayload(value: SupplyValues, initial?: Listing): ListingWrite {
  const fields = value.fields
  return {
    title: value.title.trim(), description: value.description.trim(), condition: value.condition.trim(),
    resource_type: fields.resource_type, category: fields.category, unit: fields.unit,
    suitability: [...fields.suitability], mode: fields.mode as ListingWrite['mode'],
    unit_price: fields.mode === 'DONATE' ? '0.00' : fields.unit_price,
    quantity_total: fields.quantity,
    available_until: initial && fields.deadline === toJakartaInput(initial.available_until) ? initial.available_until : toJakartaTimestamp(fields.deadline)!,
    location: locationPayload(value.location!), storage_notes: value.storage_notes.trim() || null,
    allergen_notes: value.allergen_notes.trim() || null, packaging_status: value.packaging_status.trim() || null,
  }
}
export function listingChanges(value: SupplyValues, initial: Listing): Partial<ListingWrite> {
  const next = supplyPayload(value, initial)
  const previous = supplyPayload(listingValues(initial), initial)
  const changed = (Object.keys(next) as (keyof ListingWrite)[]).filter(key => {
    if (key === 'suitability') return [...next.suitability].sort().join('|') !== [...previous.suitability].sort().join('|')
    if (key === 'unit_price' || key === 'quantity_total') return quantityText(next[key]) !== quantityText(previous[key])
    return JSON.stringify(next[key]) !== JSON.stringify(previous[key])
  })
  return Object.fromEntries(changed.map(key => [key, next[key]]))
}
