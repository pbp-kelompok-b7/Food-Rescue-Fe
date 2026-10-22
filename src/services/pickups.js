import { apiRequest } from './api.js'

const path = (id) => `pickups/${encodeURIComponent(id)}/`
export const pickupsApi = {
  schedule: (id, body) => apiRequest(`reservations/${encodeURIComponent(id)}/pickup/`, { method: 'POST', body }),
  list: (params = {}) => apiRequest(`pickups/?${new URLSearchParams(params)}`),
  detail: (id) => apiRequest(path(id)),
  update: (id, body) => apiRequest(path(id), { method: 'PATCH', body }),
  complete: (id, body) => apiRequest(`${path(id)}complete/`, { method: 'POST', body }),
  noShow: (id, body) => apiRequest(`${path(id)}no-show/`, { method: 'POST', body }),
}
