import type { ReferenceData, ReferenceOption, ReferenceUnit } from '../../services/reference.ts'

export type ResourceFormKind = 'supply' | 'request' | 'offer'
export interface ResourceFieldValues {
  resource_type: string
  category: string
  unit: string
  suitability: string[]
  intended_use: string
  mode: string
  quantity: string
  unit_price: string
  deadline: string
}
export const emptyResourceFields: ResourceFieldValues = {
  resource_type: '', category: '', unit: '', suitability: [], intended_use: '', mode: '', quantity: '', unit_price: '', deadline: '',
}

export function suitabilityOptions(data: ReferenceData, type: string): ReferenceOption[] {
  // Canonical compatibility rules (§7.2/7.3); values still come from the API.
  if (type === 'PACKAGED_FOOD_SURPLUS') return data.suitabilities.filter(value => value.code === 'HUMAN_CONSUMPTION')
  if (type === 'COMPOSTABLE_FOOD_WASTE') return data.suitabilities.filter(value => value.code !== 'HUMAN_CONSUMPTION')
  return []
}

export function changeResourceType(value: ResourceFieldValues, type: string): ResourceFieldValues {
  return { ...value, resource_type: type, category: '', suitability: [], intended_use: '' }
}

export function decimalError(value: string, places: number, allowZero = false, maxIntegerDigits?: number): string | undefined {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return 'Masukkan angka yang valid.'
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > places) return places === 0 ? 'Jumlah harus bilangan bulat.' : 'Angka terlalu rinci untuk satuan ini.'
  if (!allowZero && !/[1-9]/.test(value)) return 'Nilai harus lebih dari nol.'
  if (maxIntegerDigits && whole.replace(/^0+/, '').length > maxIntegerDigits) return 'Jumlah terlalu besar.'
}

export function quantityError(value: string, unit: ReferenceUnit): string | undefined {
  return decimalError(value, unit.allows_decimal ? unit.max_decimal_places : 0, false, 9)
}

export function toJakartaTimestamp(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null
  const timestamp = `${value.length === 16 ? `${value}:00` : value}+07:00`
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return null
  const expected = value.length === 16 ? `${value}:00` : value
  if (new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19) !== expected) return null
  return timestamp
}

export function toJakartaInput(timestamp: string): string {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime()) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)) return ''
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export function validateResourceFields(value: ResourceFieldValues, data: ReferenceData, kind: ResourceFormKind, now = Date.now()): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.resource_types.some(item => item.code === value.resource_type)) errors.resource_type = 'Pilih jenis resource.'
  if (!data.categories.some(item => item.code === value.category && item.resource_type === value.resource_type)) errors.category = 'Pilih kategori yang sesuai.'
  const unit = data.units.find(item => item.code === value.unit)
  if (!unit) errors.unit = 'Pilih satuan.'
  else {
    const message = quantityError(value.quantity, unit)
    if (message) errors.quantity = message
  }
  const allowed = suitabilityOptions(data, value.resource_type)
  if (kind === 'request') {
    if (!allowed.some(item => item.code === value.intended_use)) errors.intended_use = 'Pilih peruntukan yang sesuai.'
  } else {
    if (!value.suitability.length || new Set(value.suitability).size !== value.suitability.length || value.suitability.some(code => !allowed.some(item => item.code === code))) errors.suitability = 'Pilih peruntukan yang sesuai.'
    if (!data.modes.some(item => item.code === value.mode)) errors.mode = 'Pilih cara berbagi.'
    if (value.mode === 'SELL') {
      const message = decimalError(value.unit_price, 2)
      if (message) errors.unit_price = message
    } else if (value.mode === 'DONATE' && value.unit_price !== '0.00') errors.unit_price = 'Harga donasi harus nol.'
  }
  const deadline = toJakartaTimestamp(value.deadline)
  if (!deadline || new Date(deadline).getTime() <= now) errors.deadline = 'Pilih waktu yang valid di masa depan.'
  return errors
}

export function resourceFieldsPayload(value: ResourceFieldValues, data: ReferenceData, kind: ResourceFormKind): Record<string, string | string[]> {
  if (Object.keys(validateResourceFields(value, data, kind)).length) throw new Error('Periksa kembali pilihan resource.')
  const quantityField = kind === 'supply' ? 'quantity_total' : kind === 'request' ? 'quantity_needed' : 'quantity'
  const deadlineField = kind === 'supply' ? 'available_until' : kind === 'request' ? 'valid_until' : 'resource_deadline'
  return {
    resource_type: value.resource_type, category: value.category, unit: value.unit,
    [quantityField]: value.quantity, [deadlineField]: toJakartaTimestamp(value.deadline)!,
    ...(kind === 'request' ? { intended_use: value.intended_use } : { suitability: value.suitability, mode: value.mode, unit_price: value.mode === 'DONATE' ? '0.00' : value.unit_price }),
  }
}
