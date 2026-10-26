import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRequest, ApiError, setCsrfToken } from './api.ts'
import { login, logout, register } from './auth.ts'

test('API client', async (t) => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'csrftoken=test-token' },
  })
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  })

  await t.test('sends session cookies and CSRF with JSON writes', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit & { headers: Headers }) => {
      assert.equal(url, '/api/v1/listings/')
      assert.equal(options.credentials, 'include')
      assert.equal(options.headers.get('X-CSRFToken'), 'test-token')
      assert.equal(options.headers.get('Content-Type'), 'application/json')
      assert.equal(options.body, JSON.stringify({ quantity: 2 }))
      return Response.json({ id: 1 }, { status: 201 })
    })
    assert.deepEqual(await apiRequest('listings/', { method: 'POST', body: { quantity: 2 } }), { id: 1 })
    assert.equal(fetchMock.mock.callCount(), 1)
  })

  await t.test('GET omits CSRF and keeps query strings', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit & { headers: Headers }) => {
      assert.equal(url, '/api/v1/listings/?page=2')
      assert.equal(options.headers.has('X-CSRFToken'), false)
      return Response.json({ results: [] })
    })
    assert.deepEqual(await apiRequest('/listings/?page=2'), { results: [] })
  })

  await t.test('preserves validation response details', async (t) => {
    const errors = { quantity: ['Quantity must be positive.'] }
    t.mock.method(globalThis, 'fetch', async () => Response.json(errors, { status: 400 }))
    await assert.rejects(apiRequest('listings/'), (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 400)
      assert.deepEqual(error.data, errors)
      return true
    })
  })

  await t.test('handles empty 204 and HTML error responses', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))
    assert.equal(await apiRequest('listings/1/', { method: 'DELETE' }), null)
    fetchMock.mock.mockImplementation(async () => new Response('<html>Error</html>', { status: 502 }))
    await assert.rejects(apiRequest('listings/'), { name: 'ApiError', status: 502 })
  })

  await t.test('keeps multipart boundaries and forwards cancellation', async (t) => {
    const body = new FormData()
    body.append('title', 'Surplus')
    const controller = new AbortController()
    t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit & { headers: Headers }) => {
      assert.equal(options.body, body)
      assert.equal(options.headers.has('Content-Type'), false)
      assert.equal(options.signal, controller.signal)
      return Response.json({ id: 2 })
    })
    await apiRequest('listings/', { method: 'POST', body, signal: controller.signal })
  })

  await t.test('rejects absolute URLs before sending credentials', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({}))
    await assert.rejects(apiRequest('https://example.com/'), TypeError)
    await assert.rejects(apiRequest('//example.com/'), TypeError)
    assert.equal(fetchMock.mock.callCount(), 0)
  })
})


test('unwraps contract response and preserves field errors', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, message: 'OK', data: { id: 9 } }))
  assert.deepEqual(await apiRequest('listings/9/'), { id: 9 })
  const errors = [{ field: 'quantity', code: 'insufficient_quantity', message: 'Stock changed.' }]
  mock.mock.mockImplementation(async () => Response.json({ success: false, message: 'Conflict', errors }, { status: 409 }))
  await assert.rejects(apiRequest('listings/9/'), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.message, 'Conflict')
    assert.deepEqual(error.errors, errors)
    return error.status === 409
  })
})

test('admin actions send the correct HTTP method and resource identifier', async (t) => {
  const { adminApi } = await import('./admin.ts')
  const calls: { url: string; method: string | undefined; body: BodyInit | null | undefined }[] = []
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit & { headers: Headers }) => {
    calls.push({ url, method: options.method, body: options.body })
    return Response.json({ success: true, data: {} })
  })
  await adminApi.listUsers({ search: 'A B' })
  await adminApi.updateUser(3, { is_active: false })
  await adminApi.schedulePickup(12, { pickup_date: '2026-10-23' })
  await adminApi.completePickup(45, { expected_version: 2 })
  await adminApi.deleteListing('a/b')
  assert.deepEqual(calls, [
    { url: '/api/v1/admin/users/?search=A+B', method: 'GET', body: undefined },
    { url: '/api/v1/admin/users/3/', method: 'PATCH', body: JSON.stringify({ is_active: false }) },
    { url: '/api/v1/admin/reservations/12/pickup/', method: 'POST', body: JSON.stringify({ pickup_date: '2026-10-23' }) },
    { url: '/api/v1/admin/pickups/45/complete/', method: 'POST', body: JSON.stringify({ expected_version: 2 }) },
    { url: '/api/v1/admin/listings/a%2Fb/', method: 'DELETE', body: undefined },
  ])
})

test('auth writes bootstrap CSRF, rotate after login and accept an empty logout', async (t) => {
  setCsrfToken(null)
  t.after(() => setCsrfToken(null))
  const calls: { url: string; token: string | null; body: unknown; credentials: unknown }[] = []
  let token = 'before-login'
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit & { headers: Headers }) => {
    calls.push({ url, token: options.headers.get('X-CSRFToken'), body: options.body, credentials: options.credentials })
    if (url.endsWith('csrf/')) return Response.json({ success: true, data: { csrf_token: token } })
    if (url.endsWith('login/')) token = 'after-login'
    if (url.endsWith('logout/')) return new Response(null, { status: 204 })
    return Response.json({ success: true, data: { id: 1 } })
  })
  await register({ email: 'test@example.com', password: 'ExampleOnly!234', display_name: 'Test', whatsapp_number: null })
  await login({ email: 'test@example.com', password: 'ExampleOnly!234' })
  await apiRequest('users/me/', { method: 'PATCH', body: { display_name: 'Changed' } })
  assert.equal(await logout(), null)
  assert.deepEqual(calls.map(call => call.url), [
    '/api/v1/auth/csrf/', '/api/v1/auth/register/', '/api/v1/auth/csrf/', '/api/v1/auth/login/',
    '/api/v1/auth/csrf/', '/api/v1/users/me/', '/api/v1/auth/csrf/', '/api/v1/auth/logout/',
  ])
  assert.equal(calls[1].token, 'before-login')
  assert.equal(calls[3].token, 'before-login')
  assert.equal(calls[5].token, 'after-login')
  assert.equal(calls[7].token, 'after-login')
  assert.equal(calls[7].body, '{}')
  assert.ok(calls.every(call => call.credentials === 'include'))
})
