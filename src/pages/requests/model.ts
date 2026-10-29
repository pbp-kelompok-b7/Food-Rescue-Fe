import { ApiError } from '../../services/api.ts'
import type { ResourceRequest } from '../../services/requests.ts'
import type { RequestWrite } from '../../services/requests.ts'
import type { LocationResult, ReferenceData } from '../../services/reference.ts'
import { locationPayload } from '../../services/reference.ts'
import { decimalError, emptyResourceFields, toJakartaInput, toJakartaTimestamp, validateResourceFields, type ResourceFieldValues } from '../../components/resources/resourceFields.ts'

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

export interface RequestValues {
  fields: ResourceFieldValues
  location: LocationResult | null
  donate_only: boolean
  max_unit_price: string
}
export const emptyRequest: RequestValues = { fields: { ...emptyResourceFields }, location: null, donate_only: false, max_unit_price: '' }
export function requestValues(request: ResourceRequest): RequestValues {
  return {
    fields: { ...emptyResourceFields, resource_type: request.resource_type, category: request.category, intended_use: request.intended_use,
      quantity: quantityText(request.quantity_needed), unit: request.unit, deadline: toJakartaInput(request.valid_until) },
    location: { ...request.location, attribution: '' }, donate_only: request.donate_only, max_unit_price: request.max_unit_price ?? '',
  }
}
export function validateRequest(value: RequestValues, data: ReferenceData, initial?: ResourceRequest) {
  const errors = validateResourceFields(value.fields, data, 'request')
  const unit = data.units.find(item => item.code === value.fields.unit)
  if (unit) {
    // Request quantity is Decimal(15,3), with up to twelve integer digits.
    const error = decimalError(value.fields.quantity, unit.allows_decimal ? unit.max_decimal_places : 0, false, 12)
    if (error) errors.quantity = error
    else delete errors.quantity
  }
  if (initial && value.fields.deadline === toJakartaInput(initial.valid_until)) delete errors.deadline
  if (value.max_unit_price !== '') {
    const error = decimalError(value.max_unit_price, 2, true, 13)
    if (error) errors.max_unit_price = error
    else if (value.donate_only && /[1-9]/.test(value.max_unit_price)) errors.max_unit_price = 'Request donasi hanya boleh memiliki batas harga nol atau tanpa batas harga.'
  }
  const location = value.location
  if (!location || !location.label.trim() || location.label.length > 300 || !location.area.trim() || location.area.length > 100 || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) errors.location = 'Cari dan pilih lokasi kebutuhan yang valid.'
  return errors
}
export function requestPayload(value: RequestValues, initial?: ResourceRequest): RequestWrite {
  return {
    resource_type: value.fields.resource_type, category: value.fields.category, intended_use: value.fields.intended_use,
    quantity_needed: value.fields.quantity, unit: value.fields.unit, location: locationPayload(value.location!),
    donate_only: value.donate_only, max_unit_price: value.donate_only || value.max_unit_price === '' ? null : value.max_unit_price,
    valid_until: initial && value.fields.deadline === toJakartaInput(initial.valid_until) ? initial.valid_until : toJakartaTimestamp(value.fields.deadline)!,
  }
}
export function requestChanges(value: RequestValues, initial: ResourceRequest): Partial<RequestWrite> {
  const next = requestPayload(value, initial)
  const previous = requestPayload(requestValues(initial), initial)
  return Object.fromEntries((Object.keys(next) as (keyof RequestWrite)[]).filter(key => {
    if (key === 'quantity_needed' || key === 'max_unit_price') {
      const left = next[key], right = previous[key]
      return left === null || right === null ? left !== right : quantityText(left) !== quantityText(right)
    }
    return JSON.stringify(next[key]) !== JSON.stringify(previous[key])
  }).map(key => [key, next[key]]))
}
export function requestWriteError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Periksa kembali informasi request yang ditandai.'
    if (error.status === 403) return error.errors.some(item => item.code === 'csrf_failed') ? 'Verifikasi keamanan gagal. Coba simpan kembali.' : 'Kamu tidak memiliki izin untuk menyimpan request ini.'
    if (error.status === 409) {
      if (error.errors.some(item => item.code === 'quantity_floor')) return 'Jumlah kebutuhan tidak boleh kurang dari jumlah yang sudah dialokasikan dan terpenuhi.'
      if (error.errors.some(item => item.code === 'unit_locked')) return 'Jenis, kategori, peruntukan, dan satuan terkunci karena request sudah memiliki riwayat reservasi.'
      return 'Data request sudah berubah. Periksa status terbaru sebelum menyimpan kembali.'
    }
    if ([401, 404, 429, 501].includes(error.status)) return requestError(error)
  }
  return 'Request belum dapat disimpan. Periksa koneksi dan coba lagi.'
}
