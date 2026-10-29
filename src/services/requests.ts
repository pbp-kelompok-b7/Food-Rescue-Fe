import { resourceApi } from './resources.ts'
import { apiRequest, type ApiRequestOptions } from './api.ts'
import type { ResourceLocation } from './reference.ts'
import type { QueryParams, ResourceId } from './types.ts'
import { bootstrapCsrf } from './auth.ts'

export interface RequestWrite {
  resource_type: string
  category: string
  intended_use: string
  quantity_needed: string
  unit: string
  location: ResourceLocation
  donate_only: boolean
  max_unit_price: string | null
  valid_until: string
}

export interface ResourceRequest {
  id: number
  created_at: string
  updated_at: string
  version: number
  resource_type: string
  category: string
  intended_use: string
  quantity_needed: string
  quantity_remaining: string
  quantity_allocated: string
  quantity_fulfilled: string
  unit: string
  location: ResourceLocation
  donate_only: boolean
  max_unit_price: string | null
  valid_until: string
  owner: { id: number; display_name: string }
  status: string
  archived_at: string | null
}
export interface RequestPage { count: number; next: string | null; previous: string | null; results: ResourceRequest[] }
function requestPath(id: ResourceId) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new RangeError('ID request tidak valid.')
  return `requests/${id}/`
}
export const requestsApi = {
  ...resourceApi('requests'),
  list: (params: QueryParams = {}, options: ApiRequestOptions = {}) => apiRequest<RequestPage>(`requests/?${new URLSearchParams(params)}`, options),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => {
    return apiRequest<ResourceRequest>(requestPath(id), options)
  },
  create: async (body: RequestWrite) => {
    await bootstrapCsrf()
    return apiRequest<ResourceRequest>('requests/', { method: 'POST', body })
  },
  update: async (id: ResourceId, body: Partial<RequestWrite>) => {
    const path = requestPath(id)
    await bootstrapCsrf()
    return apiRequest<ResourceRequest>(path, { method: 'PATCH', body })
  },
}
