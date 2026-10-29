import type { ResourceId, QueryParams, ApiPayload } from './types.ts'
import { apiRequest } from './api.ts'
import type { ApiRequestOptions } from './api.ts'

const path = (id: ResourceId) => `reservations/${encodeURIComponent(id)}/`
export const reservationsApi = {
  claim: (id: ResourceId, body: ApiPayload) => apiRequest(`listings/${encodeURIComponent(id)}/claims/`, { method: 'POST', body }),
  offer: (id: ResourceId, body: ApiPayload) => apiRequest(`requests/${encodeURIComponent(id)}/offers/`, { method: 'POST', body }),
  list: (params: QueryParams = {}) => apiRequest(`reservations/?${new URLSearchParams(params)}`),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest(path(id), options),
  revise: (id: ResourceId, body: ApiPayload) => apiRequest(path(id), { method: 'PATCH', body }),
  accept: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}accept/`, { method: 'POST', body }),
  reject: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}reject/`, { method: 'POST', body }),
  cancel: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}cancel/`, { method: 'POST', body }),
}
