import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRequest, ApiError } from './api.js'

test('API client', async (t) => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'csrftoken=test-token' },
  })
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else delete globalThis.document
  })

  await t.test('sends session cookies and CSRF with JSON writes', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, '/api/listings/')
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
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, '/api/listings/?page=2')
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
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
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
