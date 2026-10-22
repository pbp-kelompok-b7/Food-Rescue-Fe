import { apiRequest } from './api.js'
const resources = new Set(['users', 'listings', 'requests', 'reservations', 'pickups'])

export const adminApi = {
  request(resource, { id, action, method = 'GET', body, params = {} } = {}) {
    if (!resources.has(resource)) throw new TypeError('Unsupported admin resource.')
    const path = `admin/${resource}/${id === undefined ? '' : `${encodeURIComponent(id)}/`}${action ? `${encodeURIComponent(action)}/` : ''}`
    return apiRequest(`${path}?${new URLSearchParams(params)}`, { method, body })
  },
}
