import type { ApiRequestOptions } from './api.ts'
import type { QueryParams } from './types.ts'
import { apiRequest } from './api.ts'
export const getReferenceData = () => apiRequest('reference-data/')
export const searchLocations = (params: QueryParams, options: ApiRequestOptions = {}) => apiRequest(`locations/search/?${new URLSearchParams(params)}`, options)
