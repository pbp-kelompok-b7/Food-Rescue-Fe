import type { ApiRequestOptions } from './api.ts'
import { apiRequest } from './api.ts'

export interface ReferenceOption { code: string; label: string }
export interface ReferenceCategory extends ReferenceOption { resource_type: string }
export interface ReferenceUnit extends ReferenceOption { allows_decimal: boolean; max_decimal_places: number }
export interface ReferenceData {
  categories: ReferenceCategory[]
  units: ReferenceUnit[]
  resource_types: ReferenceOption[]
  suitabilities: ReferenceOption[]
  modes: ReferenceOption[]
}
export interface ResourceLocation { label: string; area: string; latitude: number; longitude: number }
export interface LocationResult extends ResourceLocation { attribution: string }
export interface LocationSearchParams { q: string; area?: string; limit?: number }

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function option(value: unknown): ReferenceOption {
  if (typeof value === 'string' && value.trim()) return { code: value, label: value }
  if (record(value) && typeof value.code === 'string' && value.code.trim() && typeof value.label === 'string' && value.label.trim()) return { code: value.code, label: value.label }
  throw new Error('Respons pilihan resource tidak valid.')
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Respons pilihan resource tidak valid.')
  return value
}

export async function getReferenceData(options: ApiRequestOptions = {}): Promise<ReferenceData> {
  const raw = await apiRequest<Record<string, unknown>>('reference-data/', options)
  if (!record(raw)) throw new Error('Respons pilihan resource tidak valid.')
  return {
    categories: list(raw.categories).map(value => {
      if (!record(value) || typeof value.resource_type !== 'string') throw new Error('Respons kategori tidak valid.')
      return { ...option(value), resource_type: value.resource_type }
    }),
    units: list(raw.units).map(value => {
      if (!record(value) || typeof value.allows_decimal !== 'boolean' || !Number.isInteger(value.max_decimal_places) || Number(value.max_decimal_places) < 0 || Number(value.max_decimal_places) > 3) throw new Error('Respons satuan tidak valid.')
      return { ...option(value), allows_decimal: value.allows_decimal, max_decimal_places: Number(value.max_decimal_places) }
    }),
    resource_types: list(raw.resource_types).map(option),
    suitabilities: list(raw.suitabilities).map(option),
    modes: list(raw.modes).map(option),
  }
}

export async function searchLocations({ q, area, limit = 5 }: LocationSearchParams, options: ApiRequestOptions = {}): Promise<{ results: LocationResult[] }> {
  const query = q.trim()
  const region = area?.trim()
  if (query.length < 3 || query.length > 200 || (region && region.length > 100) || !Number.isInteger(limit) || limit < 1 || limit > 10) throw new RangeError('Parameter pencarian lokasi tidak valid.')
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  if (region) params.set('area', region)
  const data = await apiRequest<{ results: unknown[] }>(`locations/search/?${params}`, options)
  return locationResults(data)
}

export async function suggestLocations(q: string, options: ApiRequestOptions = {}) {
  const query = q.trim()
  if (query.length < 2 || query.length > 200) throw new RangeError('Parameter pencarian lokasi tidak valid.')
  return locationResults(await apiRequest<{ results: unknown[] }>(`locations/suggestions/?${new URLSearchParams({ q: query, limit: '5' })}`, options))
}

function locationResults(data: unknown): { results: LocationResult[] } {
  if (!record(data)) throw new Error('Respons lokasi tidak valid.')
  return { results: list(data.results).map(value => {
    if (!record(value) || typeof value.label !== 'string' || !value.label.trim() || typeof value.area !== 'string' || !value.area.trim() || typeof value.attribution !== 'string' || !value.attribution.trim() || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) throw new Error('Respons lokasi tidak valid.')
    return { label: value.label, area: value.area, latitude: value.latitude, longitude: value.longitude, attribution: value.attribution }
  }) }
}

// Attribution belongs to the UI; write endpoints receive only these four fields.
export function locationPayload(value: LocationResult): ResourceLocation {
  return { label: value.label, area: value.area, latitude: value.latitude, longitude: value.longitude }
}
