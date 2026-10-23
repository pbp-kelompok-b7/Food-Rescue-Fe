export interface ApiRequestOptions {
  method?: string
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

export interface ApiFieldError {
  field: string | null
  code: string
  message: string
}

const baseUrl = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')
let storedCsrfToken: string | null = null
export function setCsrfToken(token: string | null) { storedCsrfToken = token }
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export class ApiError extends Error {
  status: number
  data: unknown
  errors: ApiFieldError[]

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.errors = isRecord(data) && Array.isArray(data.errors) ? data.errors : []
  }
}

function csrfToken() {
  if (storedCsrfToken) return storedCsrfToken
  const cookie = globalThis.document?.cookie || ''
  const value = cookie.split('; ').find((item) => item.startsWith('csrftoken='))
  return value ? decodeURIComponent(value.slice('csrftoken='.length)) : null
}

export async function apiRequest<T = unknown>(path: string, { method = 'GET', body, headers, signal }: ApiRequestOptions = {}): Promise<T> {
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
  let data: unknown = null
  if (text) {
    try { data = JSON.parse(text) } catch {
      throw new ApiError('Respons server bukan JSON yang valid.', response.status, null)
    }
  }
  const envelope = isRecord(data) ? data : null
  if (!response.ok || envelope?.success === false) {
    const message = envelope?.message || envelope?.detail
    throw new ApiError(typeof message === 'string' ? message : 'Permintaan gagal diproses.', response.status, data)
  }
  return (envelope?.success === true ? envelope.data : data) as T
}
