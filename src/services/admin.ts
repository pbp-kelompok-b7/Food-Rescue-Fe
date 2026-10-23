import type { ResourceId, QueryParams, ApiPayload } from './types.ts'
import { apiRequest } from './api.ts'

export const adminApi = {
  listUsers: (params: QueryParams = {}) => apiRequest(`admin/users/?${new URLSearchParams(params)}`),
  getUser: (id: ResourceId) => apiRequest(`admin/users/${encodeURIComponent(id)}/`),
  updateUser: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/users/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),

  listListings: (params: QueryParams = {}) => apiRequest(`admin/listings/?${new URLSearchParams(params)}`),
  getListing: (id: ResourceId) => apiRequest(`admin/listings/${encodeURIComponent(id)}/`),
  createListing: (body: ApiPayload) => apiRequest('admin/listings/', { method: 'POST', body }),
  updateListing: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/listings/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  closeListing: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/listings/${encodeURIComponent(id)}/close/`, { method: 'POST', body }),
  deleteListing: (id: ResourceId) => apiRequest(`admin/listings/${encodeURIComponent(id)}/`, { method: 'DELETE' }),

  listRequests: (params: QueryParams = {}) => apiRequest(`admin/requests/?${new URLSearchParams(params)}`),
  getRequest: (id: ResourceId) => apiRequest(`admin/requests/${encodeURIComponent(id)}/`),
  createRequest: (body: ApiPayload) => apiRequest('admin/requests/', { method: 'POST', body }),
  updateRequest: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/requests/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  closeRequest: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/requests/${encodeURIComponent(id)}/close/`, { method: 'POST', body }),
  deleteRequest: (id: ResourceId) => apiRequest(`admin/requests/${encodeURIComponent(id)}/`, { method: 'DELETE' }),

  listReservations: (params: QueryParams = {}) => apiRequest(`admin/reservations/?${new URLSearchParams(params)}`),
  getReservation: (id: ResourceId) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/`),
  updateReservation: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  acceptReservation: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/accept/`, { method: 'POST', body }),
  rejectReservation: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/reject/`, { method: 'POST', body }),
  cancelReservation: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/cancel/`, { method: 'POST', body }),

  listPickups: (params: QueryParams = {}) => apiRequest(`admin/pickups/?${new URLSearchParams(params)}`),
  getPickup: (id: ResourceId) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/`),
  updatePickup: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  schedulePickup: (reservationId: ResourceId, body: ApiPayload) => apiRequest(`admin/reservations/${encodeURIComponent(reservationId)}/pickup/`, { method: 'POST', body }),
  completePickup: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/complete/`, { method: 'POST', body }),
  markPickupNoShow: (id: ResourceId, body: ApiPayload) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/no-show/`, { method: 'POST', body }),
}
