const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function csrfToken() {
  const cookie = globalThis.document?.cookie || ''
  const value = cookie.split('; ').find((item) => item.startsWith('csrftoken='))
  return value ? decodeURIComponent(value.slice('csrftoken='.length)) : null
}

export async function apiRequest(path, { method = 'GET', body, headers, signal } = {}) {
  if (!path || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) || /[\\#]/.test(path)) {
    throw new TypeError('Use an API-relative path, for example listings/.')
  }
  const url = `${baseUrl}/${path.replace(/^\/+/, '')}`
  const upperMethod = method.toUpperCase()
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')
  const isFormData = body instanceof FormData
  if (body !== undefined && !isFormData) requestHeaders.set('Content-Type', 'application/json')
  if (!safeMethods.has(upperMethod)) {
    const token = csrfToken()
    if (token) requestHeaders.set('X-CSRFToken', token)
  }
  const response = await fetch(url, {
    method: upperMethod,
    credentials: 'include',
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    signal,
  })
  const text = await response.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch {
      throw new ApiError('Respons server bukan JSON yang valid.', response.status, null)
    }
  }
  if (!response.ok) throw new ApiError(data?.detail || 'Permintaan gagal diproses.', response.status, data)
  return data
}
