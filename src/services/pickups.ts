import type { ResourceId, QueryParams, ApiPayload } from './types.ts'
import { apiRequest } from './api.ts'

const path = (id: ResourceId) => `pickups/${encodeURIComponent(id)}/`
export const pickupsApi = {
  schedule: (id: ResourceId, body: ApiPayload) => apiRequest(`reservations/${encodeURIComponent(id)}/pickup/`, { method: 'POST', body }),
  list: (params: QueryParams = {}) => apiRequest(`pickups/?${new URLSearchParams(params)}`),
  detail: (id: ResourceId) => apiRequest(path(id)),
  update: (id: ResourceId, body: ApiPayload) => apiRequest(path(id), { method: 'PATCH', body }),
  complete: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}complete/`, { method: 'POST', body }),
  noShow: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}no-show/`, { method: 'POST', body }),
}
