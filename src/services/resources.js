import { apiRequest } from './api.js'

export function resourceApi(resource) {
  const detail = (id) => `${resource}/${encodeURIComponent(id)}/`
  return {
    list: (params = {}, options = {}) => apiRequest(`${resource}/?${new URLSearchParams(params)}`, options),
    detail: (id, options = {}) => apiRequest(detail(id), options),
    create: (body) => apiRequest(`${resource}/`, { method: 'POST', body }),
    update: (id, body) => apiRequest(detail(id), { method: 'PATCH', body }),
    close: (id, body) => apiRequest(`${detail(id)}close/`, { method: 'POST', body }),
    remove: (id) => apiRequest(detail(id), { method: 'DELETE' }),
  }
}
