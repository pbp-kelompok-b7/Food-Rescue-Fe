import { apiRequest, type ApiRequestOptions } from './api.ts'
import type { ResourceLocation } from './reference.ts'
import { resourceApi } from './resources.ts'
import type { QueryParams, ResourceId } from './types.ts'

export interface ResourceRequest {
  id: number
  created_at: string
  updated_at: string
  version: number
  resource_type: string
  category: string
  intended_use: string
  quantity_needed: string
  unit: string
  location: ResourceLocation
  donate_only: boolean
  max_unit_price: string | null
  valid_until: string
  owner: { id: number; display_name: string }
  status: string
  quantity_remaining: string
  quantity_allocated: string
  quantity_fulfilled: string
  archived_at: string | null
}
export interface RequestPage { count: number; next: string | null; previous: string | null; results: ResourceRequest[] }

export function requestPath(id: ResourceId) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new RangeError('ID request tidak valid.')
  return `requests/${id}/`
}
export const requestsApi = {
  ...resourceApi('requests'),
  list: (params: QueryParams = {}, options: ApiRequestOptions = {}) => apiRequest<RequestPage>(`requests/?${new URLSearchParams(params)}`, options),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest<ResourceRequest>(requestPath(id), options),
}
