import { apiRequest } from './api.js'

const path = (id) => `reservations/${encodeURIComponent(id)}/`
export const reservationsApi = {
  claim: (id, body) => apiRequest(`listings/${encodeURIComponent(id)}/claims/`, { method: 'POST', body }),
  offer: (id, body) => apiRequest(`requests/${encodeURIComponent(id)}/offers/`, { method: 'POST', body }),
  list: (params = {}) => apiRequest(`reservations/?${new URLSearchParams(params)}`),
  detail: (id) => apiRequest(path(id)),
  revise: (id, body) => apiRequest(path(id), { method: 'PATCH', body }),
  accept: (id, body) => apiRequest(`${path(id)}accept/`, { method: 'POST', body }),
  reject: (id, body) => apiRequest(`${path(id)}reject/`, { method: 'POST', body }),
  cancel: (id, body) => apiRequest(`${path(id)}cancel/`, { method: 'POST', body }),
}
