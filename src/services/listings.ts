import { apiRequest, type ApiRequestOptions } from './api.ts'
import type { ResourceLocation } from './reference.ts'
import { resourceApi } from './resources.ts'
import type { QueryParams, ResourceId } from './types.ts'

export interface ListingWrite {
  resource_type: string
  title: string
  category: string
  description: string
  unit: string
  mode: 'DONATE' | 'SELL'
  unit_price: string
  condition: string
  suitability: string[]
  location: ResourceLocation
  storage_notes: string | null
  allergen_notes: string | null
  packaging_status: string | null
  quantity_total: string
  available_until: string
}
export interface Listing extends ListingWrite {
  id: number
  created_at: string
  updated_at: string
  version: number
  owner: { id: number; display_name: string }
  status: string
  quantity_available: string
  quantity_allocated: string
  quantity_completed: string
  archived_at: string | null
}
export interface ListingPage { count: number; next: string | null; previous: string | null; results: Listing[] }
export function listingPath(id: ResourceId) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new RangeError('ID supply tidak valid.')
  return `listings/${id}/`
}
export const listingsApi = {
  ...resourceApi('listings'),
  list: (params: QueryParams = {}, options: ApiRequestOptions = {}) => apiRequest<ListingPage>(`listings/?${new URLSearchParams(params)}`, options),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest<Listing>(listingPath(id), options),
}
