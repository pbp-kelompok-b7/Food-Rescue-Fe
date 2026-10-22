import { apiRequest } from './api.js'
export const getReferenceData = () => apiRequest('reference-data/')
export const searchLocations = (params, options = {}) => apiRequest(`locations/search/?${new URLSearchParams(params)}`, options)
