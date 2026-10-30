import type { ResourceId, QueryParams, ApiPayload } from './types.ts'
import { apiRequest } from './api.ts'
import type { ApiRequestOptions } from './api.ts'
import { bootstrapCsrf } from './auth.ts'

export interface PickupLocation {
  label: string
  area: string
  latitude: number
  longitude: number
}

export interface Pickup {
  id: ResourceId
  reservation_id: ResourceId
  created_at?: string
  updated_at?: string
  version?: number
  scheduled_at: string
  location: PickupLocation
  instructions: string | null
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | string
  completed_at: string | null
  no_show_at: string | null
  cancelled_at?: string | null
}

export interface PickupPage {
  count: number
  next: string | null
  previous: string | null
  results: Pickup[]
}

export interface PickupScheduleWrite {
  scheduled_at: string
  instructions: string | null
}

const path = (id: ResourceId) => `pickups/${encodeURIComponent(id)}/`
export const pickupsApi = {
  schedule: async (id: ResourceId, body: PickupScheduleWrite) => {
    await bootstrapCsrf()
    return apiRequest<Pickup>(`reservations/${encodeURIComponent(id)}/pickup/`, { method: 'POST', body })
  },
  list: (params: QueryParams = {}, options: ApiRequestOptions = {}) =>
    apiRequest<PickupPage>(`pickups/?${new URLSearchParams(params)}`, options),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest(path(id), options),
  update: async (id: ResourceId, body: ApiPayload) => {
    await bootstrapCsrf()
    return apiRequest<Pickup>(path(id), { method: 'PATCH', body })
  },
  complete: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}complete/`, { method: 'POST', body }),
  noShow: (id: ResourceId, body: ApiPayload) => apiRequest(`${path(id)}no-show/`, { method: 'POST', body }),
}
