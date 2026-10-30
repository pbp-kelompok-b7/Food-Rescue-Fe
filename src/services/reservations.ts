import type { ResourceId, QueryParams, ApiPayload } from './types.ts'
import type { ResourceLocation } from './reference.ts'
import { apiRequest, type ApiRequestOptions } from './api.ts'
import { bootstrapCsrf } from './auth.ts'

export interface ReservationParty { id: number; display_name: string }
export interface ReservationTerms {
  resource_type: string
  title: string
  category: string
  description: string
  condition: string
  suitability: string[]
  location: ResourceLocation
  storage_notes: string | null
  allergen_notes: string | null
  packaging_status: string | null
  quantity: string
  unit: string
  mode: 'DONATE' | 'SELL'
  unit_price: string
  total_price: string
  resource_deadline: string
}
export interface ReservationContact { user_id: number; whatsapp_number: string | null; whatsapp_url: string | null }
export interface Reservation {
  id: number
  created_at: string
  updated_at: string
  version: number
  source_type: 'LISTING_CLAIM' | 'REQUEST_OFFER'
  listing_id: number | null
  request_id: number | null
  provider: ReservationParty
  receiver: ReservationParty
  submitted_by_id: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  terms: ReservationTerms
  accepted_snapshot: ReservationTerms | null
  accepted_at: string | null
  reason: string | null
  cancellation_code: string | null
  pickup: unknown | null
  counterparty_contact: ReservationContact | null
}
export interface ReservationPage { count: number; next: string | null; previous: string | null; results: Reservation[] }

// Admin moderation detail adds both parties' contacts in every status (7.4.10).
export interface AdminReservation extends Reservation {
  provider_contact: ReservationContact
  receiver_contact: ReservationContact
}
export interface AdminReservationPage { count: number; next: string | null; previous: string | null; results: AdminReservation[] }

const path = (id: ResourceId) => `reservations/${encodeURIComponent(id)}/`
const adminPath = (id: ResourceId) => `admin/reservations/${encodeURIComponent(id)}/`
export const reservationsApi = {
  // Claim a listing. Only quantity is sent; the backend derives provider,
  // price, unit, and mode from the listing (contract 7.4.1). CSRF is bootstrapped
  // first because this is a write request.
  async claim(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<Reservation>(`listings/${encodeURIComponent(id)}/claims/`, { method: 'POST', body })
  },
  async offer(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<Reservation>(`requests/${encodeURIComponent(id)}/offers/`, { method: 'POST', body })
  },
  list: (params: QueryParams = {}, options: ApiRequestOptions = {}) => apiRequest<ReservationPage>(`reservations/?${new URLSearchParams(params)}`, options),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest<Reservation>(path(id), options),
  async revise(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<Reservation>(path(id), { method: 'PATCH', body })
  },
  async accept(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<Reservation>(`${path(id)}accept/`, { method: 'POST', body })
  },
  async reject(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<Reservation>(`${path(id)}reject/`, { method: 'POST', body })
  },
  async cancel(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<Reservation>(`${path(id)}cancel/`, { method: 'POST', body })
  },
}

// Admin moderation endpoints (contract 7.4.9-7.4.14). All actions require a
// reason for the audit trail; writes bootstrap CSRF. The admin override is
// authorization only — the backend still enforces every quantity/deadline/state
// invariant, so the client must reload the authoritative detail after each one.
export const adminReservationsApi = {
  list: (params: QueryParams = {}, options: ApiRequestOptions = {}) => apiRequest<AdminReservationPage>(`admin/reservations/?${new URLSearchParams(params)}`, options),
  detail: (id: ResourceId, options: ApiRequestOptions = {}) => apiRequest<AdminReservation>(adminPath(id), options),
  async revise(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<AdminReservation>(adminPath(id), { method: 'PATCH', body })
  },
  async accept(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<AdminReservation>(`${adminPath(id)}accept/`, { method: 'POST', body })
  },
  async reject(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<AdminReservation>(`${adminPath(id)}reject/`, { method: 'POST', body })
  },
  async cancel(id: ResourceId, body: ApiPayload) {
    await bootstrapCsrf()
    return apiRequest<AdminReservation>(`${adminPath(id)}cancel/`, { method: 'POST', body })
  },
}
