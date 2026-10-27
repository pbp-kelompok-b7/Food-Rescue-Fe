import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRequest, ApiError, setCsrfToken } from './api.ts'
import { login, loginWithGoogle, logout, register } from './auth.ts'
import { getReferenceData, locationPayload, searchLocations } from './reference.ts'
import { decimalError, quantityError, toJakartaInput, toJakartaTimestamp } from '../components/resources/resourceFields.ts'

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

test('reference-data preserves backend codes and normalizes enum labels', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, data: {
    categories: [{ code: 'server_category', label: 'Kategori server', resource_type: 'PACKAGED_FOOD_SURPLUS' }],
    units: [{ code: 'kg', label: 'Kilogram', allows_decimal: true, max_decimal_places: 3 }],
    resource_types: ['PACKAGED_FOOD_SURPLUS'], suitabilities: ['HUMAN_CONSUMPTION'], modes: [{ code: 'DONATE', label: 'Donasi' }],
  } }))
  const data = await getReferenceData()
  assert.equal(data.categories[0].code, 'server_category')
  assert.deepEqual(data.resource_types, [{ code: 'PACKAGED_FOOD_SURPLUS', label: 'PACKAGED_FOOD_SURPLUS' }])
  assert.equal(data.modes[0].label, 'Donasi')
})

test('location lookup sends only documented query parameters and preserves the selected location', async (t) => {
  const location = { label: 'Kampus UI Depok', area: 'Depok', latitude: -6.36, longitude: 106.82, attribution: '© OpenStreetMap contributors' }
  const controller = new AbortController()
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/api/v1/locations/search/?q=Kampus+UI&limit=5&area=Depok')
    assert.equal(options.signal, controller.signal)
    assert.equal(options.credentials, 'include')
    return Response.json({ success: true, data: { results: [location] } })
  })
  const response = await searchLocations({ q: ' Kampus UI ', area: ' Depok ' }, { signal: controller.signal })
  assert.deepEqual(response.results, [location])
  assert.deepEqual(locationPayload(response.results[0]), { label: location.label, area: location.area, latitude: -6.36, longitude: 106.82 })
})

test('invalid location queries never reach the server and invalid coordinates are rejected', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true, data: { results: [{ label: 'Invalid', area: 'Depok', latitude: 91, longitude: 106, attribution: 'OSM' }] } }))
  await assert.rejects(searchLocations({ q: 'ab' }), RangeError)
  await assert.rejects(searchLocations({ q: 'Depok', limit: 11 }), RangeError)
  assert.equal(fetchMock.mock.callCount(), 0)
  await assert.rejects(searchLocations({ q: 'Depok' }), /Respons lokasi tidak valid/)
})

test('API errors retain Retry-After seconds and HTTP dates', async (t) => {
  const response = (header: string) => Response.json({ success: false, errors: [{ field: null, code: 'location_rate_limited', message: 'Rate limited' }] }, { status: 429, headers: { 'Retry-After': header } })
  t.mock.method(globalThis, 'fetch', async () => response('12'))
  await assert.rejects(searchLocations({ q: 'Depok' }), (error: unknown) => error instanceof ApiError && error.retryAfter === 12)
  t.mock.method(globalThis, 'fetch', async () => response(new Date(Date.now() + 10000).toUTCString()))
  await assert.rejects(searchLocations({ q: 'Depok' }), (error: unknown) => error instanceof ApiError && error.retryAfter !== null && error.retryAfter >= 9 && error.retryAfter <= 10)
})

test('quantity precision, price strings and Jakarta timestamps avoid browser timezone conversion', () => {
  const kg = { code: 'kg', label: 'Kilogram', allows_decimal: true, max_decimal_places: 3 }
  const pcs = { code: 'pcs', label: 'Buah', allows_decimal: false, max_decimal_places: 0 }
  assert.equal(quantityError('999999999.999', kg), undefined)
  for (const value of ['1000000000', '1.0001', '0', '-1', '1e2', '1,5']) assert.ok(quantityError(value, kg))
  assert.ok(quantityError('1.5', pcs))
  assert.equal(quantityError('2', pcs), undefined)
  assert.equal(decimalError('20000.01', 2), undefined)
  assert.ok(decimalError('0.00', 2))
  assert.ok(decimalError('20000.001', 2))
  assert.equal(toJakartaTimestamp('2027-01-02T13:30'), '2027-01-02T13:30:00+07:00')
  assert.equal(toJakartaInput('2027-01-02T06:30:00Z'), '2027-01-02T13:30')
  assert.equal(toJakartaTimestamp('2027-02-30T12:00'), null)
  assert.equal(toJakartaTimestamp('2027-01-02T24:00'), null)
  assert.equal(toJakartaInput('2027-01-02T06:30'), '')
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

test('Google sign-in sends only the credential and rotates CSRF before the next write', async (t) => {
  setCsrfToken(null)
  t.after(() => setCsrfToken(null))
  let signedIn = false
  const calls: { url: string; token: string | null; body: unknown; credentials: unknown }[] = []
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit & { headers: Headers }) => {
    calls.push({ url, token: options.headers.get('X-CSRFToken'), body: options.body, credentials: options.credentials })
    if (url.endsWith('csrf/')) return Response.json({ success: true, data: { csrf_token: signedIn ? 'rotated-google-token' : 'guest-token' } })
    signedIn = true
    return Response.json({ success: true, data: { authenticated: true, user: { id: 1 } } })
  })
  await loginWithGoogle('google-credential')
  await apiRequest('users/me/', { method: 'PATCH', body: { display_name: 'Updated' } })
  assert.deepEqual(calls.map(call => call.url), ['/api/v1/auth/csrf/', '/api/v1/auth/google/', '/api/v1/auth/csrf/', '/api/v1/users/me/'])
  assert.equal(calls[1].body, JSON.stringify({ credential: 'google-credential' }))
  assert.equal(calls[1].token, 'guest-token')
  assert.equal(calls[3].token, 'rotated-google-token')
  assert.ok(calls.every(call => call.credentials === 'include'))
})
