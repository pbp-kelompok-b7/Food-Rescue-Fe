import { apiRequest } from './api.js'

export const adminApi = {
  listUsers: (params = {}) => apiRequest(`admin/users/?${new URLSearchParams(params)}`),
  getUser: (id) => apiRequest(`admin/users/${encodeURIComponent(id)}/`),
  updateUser: (id, body) => apiRequest(`admin/users/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),

  listListings: (params = {}) => apiRequest(`admin/listings/?${new URLSearchParams(params)}`),
  getListing: (id) => apiRequest(`admin/listings/${encodeURIComponent(id)}/`),
  createListing: (body) => apiRequest('admin/listings/', { method: 'POST', body }),
  updateListing: (id, body) => apiRequest(`admin/listings/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  closeListing: (id, body) => apiRequest(`admin/listings/${encodeURIComponent(id)}/close/`, { method: 'POST', body }),
  deleteListing: (id) => apiRequest(`admin/listings/${encodeURIComponent(id)}/`, { method: 'DELETE' }),

  listRequests: (params = {}) => apiRequest(`admin/requests/?${new URLSearchParams(params)}`),
  getRequest: (id) => apiRequest(`admin/requests/${encodeURIComponent(id)}/`),
  createRequest: (body) => apiRequest('admin/requests/', { method: 'POST', body }),
  updateRequest: (id, body) => apiRequest(`admin/requests/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  closeRequest: (id, body) => apiRequest(`admin/requests/${encodeURIComponent(id)}/close/`, { method: 'POST', body }),
  deleteRequest: (id) => apiRequest(`admin/requests/${encodeURIComponent(id)}/`, { method: 'DELETE' }),

  listReservations: (params = {}) => apiRequest(`admin/reservations/?${new URLSearchParams(params)}`),
  getReservation: (id) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/`),
  updateReservation: (id, body) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  acceptReservation: (id, body) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/accept/`, { method: 'POST', body }),
  rejectReservation: (id, body) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/reject/`, { method: 'POST', body }),
  cancelReservation: (id, body) => apiRequest(`admin/reservations/${encodeURIComponent(id)}/cancel/`, { method: 'POST', body }),

  listPickups: (params = {}) => apiRequest(`admin/pickups/?${new URLSearchParams(params)}`),
  getPickup: (id) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/`),
  updatePickup: (id, body) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/`, { method: 'PATCH', body }),
  schedulePickup: (reservationId, body) => apiRequest(`admin/reservations/${encodeURIComponent(reservationId)}/pickup/`, { method: 'POST', body }),
  completePickup: (id, body) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/complete/`, { method: 'POST', body }),
  markPickupNoShow: (id, body) => apiRequest(`admin/pickups/${encodeURIComponent(id)}/no-show/`, { method: 'POST', body }),
}
