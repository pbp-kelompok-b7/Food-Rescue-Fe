import { apiRequest, setCsrfToken } from './api.js'

export async function bootstrapCsrf() {
  const data = await apiRequest('auth/csrf/')
  setCsrfToken(data.csrf_token)
  return data
}
export const getSession = (options = {}) => apiRequest('auth/session/', options)
export async function login(body) {
  await bootstrapCsrf()
  const data = await apiRequest('auth/login/', { method: 'POST', body })
  await bootstrapCsrf() // Login rotates the CSRF token.
  return data
}
export async function register(body) {
  await bootstrapCsrf()
  const data = await apiRequest('auth/register/', { method: 'POST', body })
  await bootstrapCsrf()
  return data
}
export async function logout() {
  await bootstrapCsrf()
  const data = await apiRequest('auth/logout/', { method: 'POST' })
  setCsrfToken(null)
  return data
}
export const getProfile = () => apiRequest('users/me/')
export const updateProfile = (body) => apiRequest('users/me/', { method: 'PATCH', body })
