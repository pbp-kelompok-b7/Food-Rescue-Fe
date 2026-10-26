import type { ApiPayload, Session, User } from './types.ts'
import type { ApiRequestOptions } from './api.ts'
import { apiRequest, setCsrfToken } from './api.ts'

export async function bootstrapCsrf() {
  const data = await apiRequest<{ csrf_token: string }>('auth/csrf/')
  setCsrfToken(data.csrf_token)
  return data
}
export const getSession = (options: ApiRequestOptions = {}) => apiRequest<Session>('auth/session/', options)
export async function login(body: ApiPayload) {
  await bootstrapCsrf()
  const data = await apiRequest('auth/login/', { method: 'POST', body })
  setCsrfToken(null)
  await bootstrapCsrf() // Login rotates the CSRF token.
  return data
}
export async function loginWithGoogle(credential: string) {
  await bootstrapCsrf()
  const data = await apiRequest<Session>('auth/google/', { method: 'POST', body: { credential } })
  setCsrfToken(null)
  await bootstrapCsrf()
  return data
}
export async function register(body: ApiPayload) {
  await bootstrapCsrf()
  return apiRequest('auth/register/', { method: 'POST', body })
}
export async function logout() {
  await bootstrapCsrf()
  const data = await apiRequest('auth/logout/', { method: 'POST', body: {} })
  setCsrfToken(null)
  return data
}
export const getProfile = () => apiRequest<User>('users/me/')
export const updateProfile = (body: ApiPayload) => apiRequest('users/me/', { method: 'PATCH', body })
