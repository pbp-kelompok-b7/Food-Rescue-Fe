import type { ApiRequestOptions } from './api.ts'
import type { ResourceId, QueryParams, ApiPayload } from './types.ts'
import { apiRequest } from './api.ts'

export function resourceApi(resource: 'listings' | 'requests') {
  const detail = (id: ResourceId) => `${resource}/${encodeURIComponent(id)}/`
  return {
    list: (params: QueryParams = {}, options: ApiRequestOptions = {}) => apiRequest(`${resource}/?${new URLSearchParams(params)}`, options),
    detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest(detail(id), options),
    create: (body: ApiPayload) => apiRequest(`${resource}/`, { method: 'POST', body }),
    update: (id: ResourceId, body: ApiPayload) => apiRequest(detail(id), { method: 'PATCH', body }),
    close: (id: ResourceId, body: ApiPayload) => apiRequest(`${detail(id)}close/`, { method: 'POST', body }),
    remove: (id: ResourceId) => apiRequest(detail(id), { method: 'DELETE' }),
  }
}
