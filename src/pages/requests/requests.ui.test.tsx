import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import { useAuth } from '../../auth/useAuth.ts'
import { acceptingOffers, budgetText, canCloseRequest } from './model.ts'
import type { ResourceRequest } from '../../services/requests.ts'
import BrowseRequests from './BrowseRequests.tsx'
import RequestDetail from './RequestDetail.tsx'
import RequestForm from './RequestForm.tsx'
import EditRequest from './EditRequest.tsx'
import RequireAuth from '../../auth/RequireAuth.tsx'
import { setCsrfToken } from '../../services/api.ts'
import { requestChanges, requestPayload, requestValues, validateRequest } from './model.ts'
import { getReferenceData } from '../../services/reference.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const food = 'PACKAGED_FOOD_SURPLUS'
const waste = 'COMPOSTABLE_FOOD_WASTE'
const references = {
  categories: [
    { code: 'prepared_meal', label: 'Makanan siap saji', resource_type: food },
    { code: 'bakery', label: 'Roti dan kue', resource_type: food },
    { code: 'snack', label: 'Makanan ringan', resource_type: food },
    { code: 'coffee_grounds', label: 'Ampas kopi', resource_type: waste },
    { code: 'fruit_vegetable_scraps', label: 'Sisa buah dan sayuran', resource_type: waste },
    { code: 'eggshells', label: 'Cangkang telur', resource_type: waste },
  ],
  resource_types: [{ code: food, label: 'Surplus pangan kemasan' }, { code: waste, label: 'Sisa pangan organik' }],
  suitabilities: [
    { code: 'HUMAN_CONSUMPTION', label: 'Konsumsi manusia' }, { code: 'COMPOSTING', label: 'Kompos' },
    { code: 'BSF', label: 'Budidaya BSF' }, { code: 'ANIMAL_FEED', label: 'Pakan hewan' }, { code: 'UPCYCLING', label: 'Upcycling' },
  ],
  modes: [{ code: 'DONATE', label: 'Donasi' }, { code: 'SELL', label: 'Jual' }],
  units: [
    { code: 'box', label: 'Box', allows_decimal: false, max_decimal_places: 0 },
    { code: 'pcs', label: 'Buah', allows_decimal: false, max_decimal_places: 0 },
    { code: 'paket', label: 'Paket', allows_decimal: false, max_decimal_places: 0 },
    { code: 'kg', label: 'Kilogram', allows_decimal: true, max_decimal_places: 3 },
  ],
}
const fixture: ResourceRequest = {
  id: 7, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', version: 1,
  resource_type: food, category: 'prepared_meal', intended_use: 'HUMAN_CONSUMPTION',
  quantity_needed: '20.000', quantity_remaining: '12.125', quantity_allocated: '5.000', quantity_fulfilled: '2.875', unit: 'kg',
  location: { label: 'Kampus UI Depok', area: 'Depok', latitude: -6.36, longitude: 106.82 },
  donate_only: true, max_unit_price: null, valid_until: '2099-11-01T17:30:00+07:00',
  owner: { id: 1, display_name: 'Rani' }, status: 'OPEN', archived_at: null,
}
const ok = (data: unknown) => Response.json({ success: true, data })
const failure = (status: number, code = 'server_error') => Response.json({ success: false, message: 'secret backend message', errors: [{ field: null, code, message: 'private traceback' }] }, { status })
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let request: ResourceRequest
let detailStatus: number
let listStatus: number
let referenceStatus: number
let sessionStatus: number
let userId: number | null
let listResults: ResourceRequest[]
let listHandler: ((url: URL) => Promise<Response>) | undefined
let detailHandler: (() => Promise<Response>) | undefined
let writeStatus: number
let writeCode: string
let writeField: string | null
let csrfStatus: number
let writeHandler: (() => Promise<Response>) | undefined
let archiveOnDelete: boolean
let calls: { url: URL; method: string; signal: AbortSignal | null | undefined; credentials: RequestCredentials | undefined; body: Record<string, unknown> | null; csrf: string | null }[]
function SessionControls() { const auth = useAuth(); return <><button onClick={auth.clearSession}>Logout test</button><Outlet /></> }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path = '/requests', viewer: number | null = null, referenceResponseStatus = 200, staff = false) {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
  request = structuredClone(fixture); detailStatus = 200; listStatus = 200; referenceStatus = referenceResponseStatus; sessionStatus = 200; userId = viewer; listResults = [request]; calls = []; listHandler = undefined; detailHandler = undefined
  writeStatus = 200; writeCode = 'validation_error'; writeField = null; csrfStatus = 200; writeHandler = undefined
  archiveOnDelete = false
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit) => {
    const url = new URL(path, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    calls.push({ url, method, signal: options.signal, credentials: options.credentials, body, csrf: new Headers(options.headers).get('X-CSRFToken') })
    if (url.pathname.endsWith('session/')) return sessionStatus === 200 ? ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Viewer', is_admin: staff } }) : failure(sessionStatus)
    if (url.pathname.endsWith('csrf/')) return csrfStatus === 200 ? ok({ csrf_token: 'request-token' }) : failure(csrfStatus, 'csrf_failed')
    if (url.pathname.endsWith('locations/search/')) return ok({ results: [{ ...fixture.location, attribution: '© OpenStreetMap contributors' }] })
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      if (writeHandler) return writeHandler()
      if (writeStatus >= 400) return Response.json({ success: false, message: 'Secret traceback', errors: [{ field: writeField, code: writeCode, message: writeField ? 'Informasi ditolak server.' : 'Private backend details' }] }, { status: writeStatus })
      if (method === 'DELETE') {
        if (archiveOnDelete) {
          request = { ...request, archived_at: '2026-10-29T01:00:00Z', status: ['OPEN', 'ALLOCATED'].includes(request.status) ? 'CLOSED' : request.status }
          listResults = listResults.map(value => value.id === request.id ? request : value)
        } else { listResults = listResults.filter(value => value.id !== request.id); detailStatus = 404 }
        return new Response(null, { status: 204 })
      }
      if (url.pathname.endsWith('close/')) {
        request = { ...request, status: 'CLOSED' }; listResults = listResults.map(value => value.id === request.id ? request : value); return ok(request)
      }
      request = { ...request, ...body, id: method === 'POST' ? 8 : request.id, version: request.version + 1 }
      return ok(request)
    }
    if (url.pathname.endsWith('reference-data/')) return referenceStatus === 200 ? ok(references) : failure(referenceStatus)
    if (url.pathname.endsWith('requests/')) {
      const results = listResults.filter(value => url.searchParams.get('scope') !== 'mine' || value.owner.id === userId)
      return listHandler ? listHandler(url) : listStatus === 200 ? ok({ count: results.length ? 21 : 0, next: results.length ? '/api/v1/requests/?page=2' : null, previous: url.searchParams.get('page') === '2' ? '/api/v1/requests/?page=1' : null, results: results.map(value => ({ ...value, whatsapp_number: '+628120000000', email: 'private@example.test' })) }) : failure(listStatus, listStatus === 404 ? 'page_not_found' : 'server_error')
    }
    if (/\/requests\/\d+\/$/.test(url.pathname)) return detailHandler ? detailHandler() : detailStatus === 200 ? ok({ ...request, whatsapp_number: '+628120000000', email: 'private@example.test' }) : failure(detailStatus)
    throw new Error(`Unexpected request ${url.pathname}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{ element: <AuthProvider><SessionControls /></AuthProvider>, children: [
    { path: '/requests', element: <BrowseRequests /> }, { path: '/requests/:id', element: <RequestDetail /> },
    { element: <RequireAuth />, children: [{ path: '/requests/new', element: <RequestForm /> }, { path: '/requests/:id/edit', element: <EditRequest /> }, { path: '/my/requests', element: <BrowseRequests mine /> }] },
    { path: '/login', element: <h1>Masuk</h1> }, { path: '/requests/:id/offer', element: <h1>Form offer</h1> },
  ] }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
}
async function click(text: string) {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)!
  expect(button, text).toBeDefined(); await act(async () => button.click()); await settle()
}
async function select(name: string, value: string) {
  const radio = container.querySelector<HTMLInputElement>(`input[type="radio"][name="${name}"][value="${value}"]`)
  if (radio) { await act(async () => radio.click()); return }
  const element = container.querySelector<HTMLSelectElement>(`[name="${name}"]`)!
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function input(name: string, value: string) {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); await settle() }
const listCalls = () => calls.filter(item => item.url.pathname.endsWith('requests/'))
afterEach(async () => { await act(async () => root?.unmount()); router?.dispose(); container?.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); setCsrfToken(null) })

it('loads only public query fields and renders contract values without contacts', async () => {
  await mount('/requests?q=meal&area=Depok&resource_type=PACKAGED_FOOD_SURPLUS&category=prepared_meal&intended_use=HUMAN_CONSUMPTION&donate_only=false&ordering=valid_until&scope=mine&status=CLOSED')
  const call = listCalls()[0]
  expect(Object.fromEntries(call.url.searchParams)).toEqual({ page: '1', page_size: '20', ordering: 'valid_until', q: 'meal', area: 'Depok', resource_type: food, category: 'prepared_meal', intended_use: 'HUMAN_CONSUMPTION', donate_only: 'false' })
  expect(call.credentials).toBe('include')
  expect(container.textContent).toContain('12.125 kg')
  expect(container.textContent).toContain('Total 20 · Alokasi 5 · Terpenuhi 2.875')
  expect(container.textContent).toContain('Depok')
  expect(container.textContent).toContain('WIB')
  expect(container.querySelector('a[href="/requests/7"]')).not.toBeNull()
  expect(container.textContent).not.toMatch(/private@example|628120000000|traceback/)
})
it('applies all filters, preserves false, and resets pagination', async () => {
  await mount('/requests?page=2')
  await select('resource_type', waste); await select('category', 'coffee_grounds'); await select('intended_use', 'COMPOSTING'); await select('donate_only', 'false'); await click('Terapkan filter')
  expect(Object.fromEntries(new URLSearchParams(router.state.location.search))).toEqual({ resource_type: waste, category: 'coffee_grounds', intended_use: 'COMPOSTING', donate_only: 'false' })
  await click('Berikutnya'); expect(router.state.location.search).toContain('page=2')
  await click('Sebelumnya'); expect(router.state.location.search).toContain('page=1')
  await select('ordering', 'valid_until'); expect(router.state.location.search).not.toContain('page=')
  await click('Reset'); expect(router.state.location.search).toBe('')
})
it('clears incompatible draft fields when changing resource type', async () => {
  await mount('/requests?resource_type=PACKAGED_FOOD_SURPLUS&category=prepared_meal&intended_use=HUMAN_CONSUMPTION')
  await select('resource_type', waste)
  expect(container.querySelector<HTMLSelectElement>('[name="category"]')!.value).toBe('')
  expect(container.querySelector<HTMLSelectElement>('[name="intended_use"]')!.value).toBe('')
  expect(container.querySelector('[name="intended_use"]')!.textContent).not.toContain('Konsumsi manusia')
})
it('trims search/area and resets page; short searches show an accessible error', async () => {
  await mount('/requests?page=2')
  await input('q', 'a'); await submit()
  expect(container.querySelector('[name="q"]')!.getAttribute('aria-invalid')).toBe('true')
  expect(listCalls()).toHaveLength(1)
  await input('q', '  meal  '); await input('area', '  Depok  '); await submit()
  expect(router.state.location.search).toBe('?q=meal&area=Depok')
})
it.each(['?q=a', '?q=%20%20', '?page=0', '?page=abc', '?ordering=unknown', '?area=%20%20'])('rejects malformed URL input %s without requesting results', async query => {
  await mount(`/requests${query}`)
  expect(listCalls()).toHaveLength(0)
  expect(container.textContent).toContain('Pencarian tidak valid')
  await click('Reset pencarian'); expect(listCalls()).toHaveLength(1)
})
it('shows empty state, disables last-page navigation, and can reset', async () => {
  await mount(); listResults = []; await click('Reset'); await act(async () => { await router.navigate('/requests?q=missing') }); await settle()
  expect(container.textContent).toContain('Belum ada kebutuhan yang sesuai')
  await click('Reset pencarian'); expect(router.state.location.search).toBe('')
})
it('supports loading, safe errors, and retry without leaking server messages', async () => {
  await mount(); listStatus = 500; await act(async () => { await router.navigate('/requests?q=error') }); await settle()
  expect(container.textContent).toContain('Kebutuhan belum dapat dimuat')
  expect(container.textContent).not.toMatch(/secret|traceback/)
  let resolve: (value: Response) => void = () => {}
  listHandler = () => new Promise(done => { resolve = done })
  await click('Coba lagi'); expect(container.textContent).toContain('Memuat kebutuhan…')
  await act(async () => resolve(ok({ count: 0, next: null, previous: null, results: [] })))
  expect(container.textContent).toContain('Belum ada kebutuhan yang sesuai')
})
it('handles out-of-range pages with a first-page reset', async () => {
  await mount(); listStatus = 404; await act(async () => { await router.navigate('/requests?page=99') }); await settle()
  expect(container.textContent).toContain('Halaman hasil tidak ditemukan')
  listStatus = 200; await click('Reset pencarian'); expect(router.state.location.search).toBe('')
})
it('aborts old searches and restores search fields on browser back', async () => {
  await mount(); let resolve: (value: Response) => void = () => {}
  listHandler = url => url.searchParams.get('q') === 'old' ? new Promise(done => { resolve = done }) : Promise.resolve(ok({ count: 0, next: null, previous: null, results: [] }))
  await act(async () => { await router.navigate('/requests?q=old') }); const old = listCalls().at(-1)!
  await act(async () => { await router.navigate('/requests?q=new') }); await settle()
  expect(old.signal?.aborted).toBe(true)
  await act(async () => resolve(ok({ count: 1, next: null, previous: null, results: [fixture] })))
  expect(container.textContent).not.toContain('Kebutuhan Makanan siap saji')
  await act(async () => { await router.navigate(-1) }); expect(container.querySelector<HTMLInputElement>('[name="q"]')!.value).toBe('old')
})
it('keeps browsing and donation filtering available when reference-data fails', async () => {
  await mount('/requests', null, 501)
  expect(container.textContent).toContain('Pilihan resource belum tersedia')
  expect(container.textContent).toContain('12.125 kg')
  await select('donate_only', 'true'); await click('Terapkan filter')
  expect(listCalls().at(-1)!.url.searchParams.get('donate_only')).toBe('true')
  referenceStatus = 200; await click('Muat pilihan filter'); expect(container.querySelector('[name="category"]')).not.toBeNull()
})
it('opens and dismisses the mobile filter sheet using native dialog semantics', async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
  await mount(); await click('Filter')
  const dialog = container.querySelector('dialog')!
  expect(dialog.hasAttribute('open')).toBe(true)
  expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
  await act(async () => dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
  expect(dialog.hasAttribute('open')).toBe(false)
})
it('renders detail counters, budget/deadline and only explicitly public fields', async () => {
  await mount('/requests/7')
  for (const text of ['Total dibutuhkan', 'Dialokasikan', 'Sudah terpenuhi', '12.125 kg', '20 kg', '5 kg', '2.875 kg', 'Hanya menerima donasi', 'WIB', 'Rani']) expect(container.textContent).toContain(text)
  expect(container.textContent).not.toMatch(/private@example|628120000000|traceback/)
  expect(container.textContent).toContain('Provider menentukan lokasi resource saat menawarkan.')
})
it('takes guests to login and retains the offer destination', async () => {
  await mount('/requests/7'); await act(async () => container.querySelector<HTMLAnchorElement>('a[href="/login"]')!.click())
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/requests/7/offer' })
})
it('takes another authenticated user directly to offer without a listing prerequisite', async () => {
  await mount('/requests/7', 2); await act(async () => container.querySelector<HTMLAnchorElement>('a[href="/requests/7/offer"]')!.click())
  expect(router.state.location.pathname).toBe('/requests/7/offer')
})
it('prevents owners from offering to their own request', async () => {
  await mount('/requests/7', 1)
  expect(container.textContent).toContain('tidak dapat menawarkan resource ke request sendiri')
  expect(container.querySelector('a[href$="/offer"]')).toBeNull()
})
it.each([
  { status: 'CLOSED' }, { status: 'ALLOCATED' }, { status: 'FULFILLED' }, { status: 'EXPIRED' },
  { archived_at: '2026-10-01T00:00:00Z' }, { quantity_remaining: '0.000' }, { valid_until: '2020-01-01T00:00:00Z' },
])('disables offers for unavailable request %j returned to a permitted viewer', async override => {
  await mount('/requests/7', 2); Object.assign(request, override); await click('Perbarui status')
  expect(container.querySelector('a[href$="/offer"]')).toBeNull()
  expect(container.textContent).toContain('Request tidak menerima penawaran')
})
it.each([400, 401, 403, 404, 429, 500, 501])('shows safe detail error %i and retries', async status => {
  await mount('/requests/7'); detailStatus = status; await click('Perbarui status')
  expect(container.textContent).not.toMatch(/secret|traceback/)
  expect(container.querySelector('a[href$="/offer"]')).toBeNull()
  detailStatus = 200; await click('Coba lagi'); expect(container.textContent).toContain('12.125 kg')
})
it('rejects malformed IDs locally', async () => {
  await mount('/requests/nope'); expect(container.textContent).toContain('ID request tidak valid')
  expect(calls.some(item => item.url.pathname.includes('/requests/nope/'))).toBe(false)
})
it('refreshes details on focus and reads changed server state', async () => {
  await mount('/requests/7', 2); request.status = 'CLOSED'
  await act(async () => window.dispatchEvent(new Event('focus'))); await settle()
  expect(container.textContent).toContain('CLOSED')
  expect(container.querySelector('a[href$="/offer"]')).toBeNull()
})
it('clears private details immediately on logout even while the anonymous read is pending', async () => {
  await mount('/requests/7', 1); request.status = 'CLOSED'; await click('Perbarui status')
  detailHandler = () => new Promise(() => {})
  await click('Logout test')
  expect(container.textContent).not.toContain('Rani')
  expect(container.textContent).toContain('Memuat detail kebutuhan')
})
it('revalidates with the server when the request deadline elapses', async () => {
  await mount('/requests/7', 2)
  request.valid_until = new Date(Date.now() + 150).toISOString(); await click('Perbarui status')
  const before = calls.filter(item => /\/requests\/7\/$/.test(item.url.pathname)).length
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)) })
  expect(calls.filter(item => /\/requests\/7\/$/.test(item.url.pathname)).length).toBeGreaterThan(before)
  expect(container.querySelector('a[href$="/offer"]')).toBeNull()
})
it('formats null, zero and capped budgets distinctly', () => {
  expect(budgetText({ ...fixture, donate_only: false, max_unit_price: null })).toContain('Tanpa batas harga')
  expect(budgetText({ ...fixture, donate_only: false, max_unit_price: '0.00' })).toMatch(/Maksimal.*0.*\/ kg/)
  expect(budgetText({ ...fixture, donate_only: false, max_unit_price: '15000.50' })).toContain('15.000,5')
  expect(acceptingOffers(fixture)).toBe(true)
})
it('refreshes the public list on focus without retaining stale cards', async () => {
  await mount(); listResults = []
  await act(async () => window.dispatchEvent(new Event('focus'))); await settle()
  expect(container.textContent).toContain('Belum ada kebutuhan yang sesuai')
  expect(container.querySelector('a[href="/requests/7"]')).toBeNull()
})
it('re-reads the public list at its next resource deadline', async () => {
  await mount(); request.valid_until = new Date(Date.now() + 150).toISOString()
  await click('Perbarui hasil'); const before = listCalls().length; listResults = []
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)) })
  expect(listCalls().length).toBeGreaterThan(before)
  expect(container.textContent).toContain('Belum ada kebutuhan yang sesuai')
})
it('uses the PR37 catalog labels and restricts all categories/uses to the chosen type', async () => {
  await mount()
  expect(container.textContent).toContain('Kebutuhan Makanan siap saji')
  const values = (name: string) => [...container.querySelectorAll<HTMLOptionElement>(`[name="${name}"] option`)].map(option => option.value)
  await select('resource_type', food)
  expect(values('category')).toEqual(['', 'prepared_meal', 'bakery', 'snack'])
  expect(values('intended_use')).toEqual(['', 'HUMAN_CONSUMPTION'])
  await select('resource_type', waste)
  expect(values('category')).toEqual(['', 'coffee_grounds', 'fruit_vegetable_scraps', 'eggshells'])
  expect(values('intended_use')).toEqual(['', 'COMPOSTING', 'BSF', 'ANIMAL_FEED', 'UPCYCLING'])
})

const writes = () => calls.filter(call => ['POST', 'PATCH', 'DELETE'].includes(call.method))
async function completeRequest() {
  await select('resource_type', food); await select('category', 'prepared_meal'); await select('intended_use', 'HUMAN_CONSUMPTION')
  await input('quantity_needed', '20'); await select('unit', 'box'); await input('valid_until', '2099-11-01T17:30')
  const search = container.querySelector<HTMLInputElement>('[type="search"]')!
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'Kampus UI'); search.dispatchEvent(new Event('input', { bubbles: true })) })
  const button = container.querySelector<HTMLButtonElement>('[aria-label="Cari lokasi"]')!
  await act(async () => button.click()); await settle(); await click('Pilih')
}
it('creates a donation request with session, CSRF and only writable contract fields', async () => {
  await mount('/requests/new', 1); await completeRequest()
  await act(async () => container.querySelector<HTMLInputElement>('[name="donate_only"]')!.click())
  await submit()
  expect(writes()).toHaveLength(1)
  expect(writes()[0]).toMatchObject({ method: 'POST', credentials: 'include', csrf: 'request-token' })
  expect(writes()[0].body).toEqual({ resource_type: food, category: 'prepared_meal', intended_use: 'HUMAN_CONSUMPTION', quantity_needed: '20', unit: 'box', location: fixture.location, donate_only: true, max_unit_price: null, valid_until: '2099-11-01T17:30:00+07:00' })
  expect(router.state.location.pathname).toBe('/requests/8')
  expect(container.textContent).toContain('Request berhasil diterbitkan')
})
it('validates bounded-price choices before sending writes', async () => {
  await mount('/requests/new', 1); await completeRequest()
  await click('Batas harga'); await submit()
  expect(writes()).toHaveLength(0)
  expect(container.textContent).toContain('Isi batas harga per satuan atau pilih Tanpa batas.')
  await input('max_unit_price', '0.00'); await submit()
  expect(writes()[0].body).toMatchObject({ max_unit_price: '0.00' })
})
it.each([['', null], ['0.00', '0.00'], ['15000.50', '15000.50']])('creates a priced-cap preference %s without rounding or coercing null', async (price, expected) => {
  await mount('/requests/new', 1); await completeRequest(); await input('max_unit_price', price!); await submit()
  expect(writes()[0].body).toMatchObject({ donate_only: false, max_unit_price: expected })
})
it('clears paid cap when donation-only is selected', async () => {
  await mount('/requests/new', 1); await completeRequest(); await input('max_unit_price', '100.00')
  await act(async () => container.querySelector<HTMLInputElement>('[name="donate_only"]')!.click())
  expect(container.querySelector<HTMLInputElement>('[name="max_unit_price"]')!.value).toBe('')
  expect(container.querySelector<HTMLInputElement>('[name="max_unit_price"]')!.disabled).toBe(true)
  await submit(); expect(writes()[0].body!.max_unit_price).toBeNull()
})
it('loads existing edit values, sends a minimal PATCH and shows saved feedback', async () => {
  await mount('/requests/7/edit', 1)
  expect(container.querySelector<HTMLInputElement>('[name="quantity_needed"]')!.value).toBe('20')
  expect(container.textContent).toContain('Lokasi terpilih')
  expect(container.querySelector<HTMLInputElement>('[name="valid_until"]')!.value).toBe('2099-11-01T17:30')
  await input('quantity_needed', '30'); await submit()
  expect(writes()[0]).toMatchObject({ method: 'PATCH', csrf: 'request-token', body: { quantity_needed: '30' } })
  expect(Object.keys(writes()[0].body!)).toEqual(['quantity_needed'])
  expect(router.state.location.pathname).toBe('/requests/7')
  expect(container.textContent).toContain('Perubahan request berhasil disimpan')
})
it('does not submit unchanged edits', async () => {
  await mount('/requests/7/edit', 1); await submit()
  expect(writes()).toHaveLength(0)
  expect(container.textContent).toContain('Belum ada perubahan')
})
it('guards guest forms and blocks non-owner edit while retaining staff access', async () => {
  await mount('/requests/new'); expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/requests/new' })
})
it('denies an authenticated non-owner edit even when the detail is public', async () => {
  await mount('/requests/7/edit', 2)
  expect(container.textContent).toContain('Akses ditolak')
  expect(container.querySelector('form')).toBeNull()
})
it('allows staff to edit requests through the regular endpoint', async () => {
  await mount('/requests/7/edit', 2, 200, true); await input('quantity_needed', '25'); await submit()
  expect(writes()[0].body).toEqual({ quantity_needed: '25' })
})
it.each([['quantity_needed', '0'], ['quantity_needed', '2.5'], ['max_unit_price', '-1'], ['max_unit_price', '10.001'], ['valid_until', '2020-01-01T00:00']])('validates invalid %s=%s without writing and preserves the draft', async (field, value) => {
  await mount('/requests/new', 1); await completeRequest(); await input(field, value); await submit()
  expect(writes()).toHaveLength(0)
  expect(container.querySelector<HTMLInputElement>(`[name="${field}"]`)!.value).toBe(value)
  expect(container.querySelector(`[name="${field}"]`)!.getAttribute('aria-invalid')).toBe('true')
})
it('requires selecting a valid location before create', async () => {
  await mount('/requests/new', 1); await completeRequest(); await click('Ubah lokasi'); await submit()
  expect(writes()).toHaveLength(0)
  expect(container.textContent).toContain('Cari dan pilih lokasi kebutuhan yang valid')
})
it('maps server field errors and preserves user input after validation failure', async () => {
  await mount('/requests/new', 1); await completeRequest(); writeStatus = 400; writeField = 'quantity_needed'; await submit()
  expect(container.textContent).toContain('Informasi ditolak server')
  expect(container.querySelector('[name="quantity_needed"]')!.getAttribute('aria-invalid')).toBe('true')
  expect(container.querySelector<HTMLInputElement>('[name="quantity_needed"]')!.value).toBe('20')
  expect(container.textContent).not.toContain('Secret traceback')
})
it.each([403, 404, 409, 429, 500, 501])('handles save failure %i without losing the draft or navigating', async status => {
  await mount('/requests/new', 1); await completeRequest(); writeStatus = status; await submit()
  expect(router.state.location.pathname).toBe('/requests/new')
  expect(container.querySelector<HTMLInputElement>('[name="quantity_needed"]')!.value).toBe('20')
  expect(container.textContent).toContain('Request belum tersimpan')
  expect(container.textContent).not.toMatch(/Private backend|Secret traceback/)
})
it('redirects an expired session back to login with the form destination', async () => {
  await mount('/requests/new', 1); await completeRequest(); writeStatus = 401; await submit()
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/requests/new' })
})
it('stops a write when CSRF bootstrap fails', async () => {
  await mount('/requests/new', 1); await completeRequest(); csrfStatus = 403; await submit()
  expect(writes()).toHaveLength(0)
  expect(container.textContent).toContain('Verifikasi keamanan gagal')
})
it('prevents duplicate writes and disables controls until the save resolves', async () => {
  await mount('/requests/new', 1); await completeRequest()
  let finish: (response: Response) => void = () => {}
  writeHandler = () => new Promise(resolve => { finish = resolve })
  await submit(); await submit()
  expect(writes()).toHaveLength(1)
  expect(container.querySelector<HTMLFieldSetElement>('form > fieldset')!.disabled).toBe(true)
  await act(async () => finish(ok({ ...fixture, id: 8 }))); await settle()
  expect(router.state.location.pathname).toBe('/requests/8')
})
it('handles quantity-floor conflicts without replacing the draft', async () => {
  await mount('/requests/7/edit', 1); await input('quantity_needed', '1'); writeStatus = 409; writeCode = 'quantity_floor'; await submit()
  expect(container.textContent).toContain('dialokasikan dan terpenuhi')
  expect(container.querySelector<HTMLInputElement>('[name="quantity_needed"]')!.value).toBe('1')
})
it('can restore locked identity fields while preserving other edits', async () => {
  await mount('/requests/7/edit', 1); await select('category', 'bakery'); await input('quantity_needed', '25')
  writeStatus = 409; writeCode = 'unit_locked'; await submit(); await click('Pulihkan field terkunci')
  expect(container.querySelector<HTMLSelectElement>('[name="category"]')!.value).toBe('prepared_meal')
  expect(container.querySelector<HTMLInputElement>('[name="quantity_needed"]')!.value).toBe('25')
  writeStatus = 200; await submit(); expect(writes().at(-1)!.body).toEqual({ quantity_needed: '25' })
})
it('allows unchanged expired deadlines and terminal edits without sending status/counters', async () => {
  await mount('/requests/7/edit', 1)
  await act(async () => { await router.navigate('/requests') }); request.valid_until = '2020-01-01T00:00:00.123Z'; request.status = 'CLOSED'
  await act(async () => { await router.navigate('/requests/7/edit') }); await settle()
  expect(container.textContent).toContain('tidak membuka kembali request')
  await input('quantity_needed', '25'); await submit()
  expect(writes()[0].body).toEqual({ quantity_needed: '25' })
  expect(request.status).toBe('CLOSED')
})
it('handles unavailable catalog with retry before allowing a form submission', async () => {
  await mount('/requests/new', 1, 501)
  expect(container.querySelector('form')).toBeNull()
  referenceStatus = 200; await click('Muat pilihan resource')
  expect(container.querySelector('form')).not.toBeNull()
})
it('validates exact decimal boundaries and serializes request fields without protected data', async () => {
  await mount(); const catalog = await getReferenceData(); const value = requestValues(fixture)
  value.fields.quantity = '999999999999.999'
  expect(validateRequest(value, catalog)).toEqual({})
  value.fields.quantity = '1000000000000'
  expect(validateRequest(value, catalog).quantity).toBeDefined()
  value.fields.quantity = '1.1234'; expect(validateRequest(value, catalog).quantity).toBeDefined()
  value.fields.quantity = '1'; value.fields.intended_use = 'COMPOSTING'; expect(validateRequest(value, catalog).intended_use).toBeDefined()
  const unchanged = requestValues(fixture)
  expect(requestChanges(unchanged, fixture)).toEqual({})
  expect(requestPayload(unchanged)).not.toHaveProperty('status')
  expect(requestPayload(unchanged)).not.toHaveProperty('owner')
})
it('loads owner history with fixed scope and keeps status across pagination/search', async () => {
  await mount('/my/requests?scope=public&status=CLOSED&page=2', 1)
  expect(listCalls()[0].url.searchParams.get('scope')).toBe('mine')
  expect(listCalls()[0].url.searchParams.get('status')).toBe('CLOSED')
  await input('q', 'meal'); await submit()
  expect(router.state.location.search).toContain('status=CLOSED')
  expect(router.state.location.search).not.toContain('page=')
  await select('status', 'ALLOCATED'); expect(listCalls().at(-1)!.url.searchParams.get('status')).toBe('ALLOCATED')
  await click('Reset'); expect(listCalls().at(-1)!.url.searchParams.get('scope')).toBe('mine')
})
it('guards anonymous history and never requests private data before login', async () => {
  await mount('/my/requests')
  expect(router.state.location.pathname).toBe('/login')
  expect(listCalls()).toHaveLength(0)
})
it('displays an empty owner history rather than other users records', async () => {
  await mount('/my/requests', 2)
  expect(container.textContent).toContain('Belum ada kebutuhan yang sesuai')
  expect(container.querySelector('a[href="/requests/7"]')).toBeNull()
})
it.each(['OPEN', 'ALLOCATED', 'FULFILLED', 'CLOSED', 'EXPIRED'])('supports historical status %s and archived indicators', async status => {
  await mount('/my/requests', 1); request.status = status; request.archived_at = '2026-10-01T00:00:00Z'
  await click('Perbarui hasil')
  expect(container.textContent).toContain('Diarsipkan')
  expect(container.textContent).toContain('12.125 kg')
  expect(container.querySelector('a[href="/requests/7/edit"]')).not.toBeNull()
})
it('requires a reason and sends a trimmed close body with CSRF before refreshing history', async () => {
  await mount('/my/requests', 1); await click('Tutup request')
  expect(container.textContent).toContain('Reservasi ACCEPTED, alokasi, dan pickup')
  await click('Ya, tutup request'); expect(writes()).toHaveLength(0)
  expect(container.querySelector('[name="close_reason"]')!.getAttribute('aria-invalid')).toBe('true')
  await input('close_reason', '  Kebutuhan sudah cukup.  '); await click('Ya, tutup request')
  expect(writes()[0]).toMatchObject({ method: 'POST', csrf: 'request-token', body: { reason: 'Kebutuhan sudah cukup.' } })
  expect(writes()[0].url.pathname).toBe('/api/v1/requests/7/close/')
  expect(container.textContent).toContain('Request berhasil ditutup')
  expect(container.textContent).toContain('Ditutup')
  expect(container.querySelector('[name="close_reason"]')).toBeNull()
})
it('cancels confirmation without sending a write', async () => {
  await mount('/my/requests', 1); await click('Hapus / arsipkan'); await click('Batal')
  expect(writes()).toHaveLength(0)
  expect(container.querySelector('dialog[open]')).toBeNull()
})
it('handles empty DELETE 204 without a body and reloads the list', async () => {
  await mount('/my/requests', 1); await click('Hapus / arsipkan')
  expect(container.textContent).toContain('termasuk reservasi ditolak atau dibatalkan')
  await click('Ya, hapus / arsipkan')
  expect(writes()[0]).toMatchObject({ method: 'DELETE', body: null, csrf: 'request-token' })
  expect(container.querySelector('a[href="/requests/7"]')).toBeNull()
  expect(container.textContent).toContain('Request berhasil dihapus atau diarsipkan')
})
it('uses server archival results even when quantity counters do not reveal the history', async () => {
  await mount('/my/requests', 1); archiveOnDelete = true; request.quantity_allocated = '0.000'; request.quantity_fulfilled = '0.000'
  await click('Hapus / arsipkan'); await click('Ya, hapus / arsipkan')
  expect(container.textContent).toContain('Diarsipkan')
  expect(container.querySelector('a[href="/requests/7"]')).not.toBeNull()
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Hapus / arsipkan')).toBe(false)
})
it('returns from detail to refreshed owner history after delete', async () => {
  await mount('/requests/7', 1); await click('Hapus / arsipkan'); await click('Ya, hapus / arsipkan')
  expect(router.state.location.pathname).toBe('/my/requests')
  expect(container.textContent).toContain('Request berhasil dihapus atau diarsipkan')
})
it('retains the close draft and maps server reason validation inline', async () => {
  await mount('/my/requests', 1); await click('Tutup request'); await input('close_reason', 'Alasan saya')
  writeStatus = 400; writeField = 'reason'; await click('Ya, tutup request')
  expect(container.querySelector<HTMLTextAreaElement>('[name="close_reason"]')!.value).toBe('Alasan saya')
  expect(container.querySelector('[name="close_reason"]')!.getAttribute('aria-invalid')).toBe('true')
  expect(container.textContent).toContain('Informasi ditolak server')
})
it('retains a close draft on conflict while refreshing changed server data', async () => {
  await mount('/my/requests', 1); await click('Tutup request'); await input('close_reason', 'Sudah cukup')
  request.status = 'CLOSED'; writeStatus = 409; writeCode = 'invalid_transition'; await click('Ya, tutup request')
  expect(container.textContent).toContain('Request sudah berubah')
  expect(container.textContent).toContain('Ditutup')
  expect(container.querySelector<HTMLTextAreaElement>('[name="close_reason"]')!.value).toBe('Sudah cukup')
  expect(container.textContent).not.toContain('Request berhasil ditutup')
})
it.each([403, 404, 500, 501])('handles failed close %i without a false success or exposing internals', async status => {
  await mount('/my/requests', 1); await click('Tutup request'); await input('close_reason', 'Alasan saya'); writeStatus = status; await click('Ya, tutup request')
  expect(container.textContent).toContain('Tindakan belum berhasil')
  expect(container.textContent).not.toMatch(/Secret traceback|Private backend|Request berhasil ditutup/)
})
it('redirects an expired close session with the history destination', async () => {
  await mount('/my/requests?q=meal', 1); await click('Tutup request'); await input('close_reason', 'Alasan saya'); writeStatus = 401; await click('Ya, tutup request')
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/my/requests?q=meal' })
})
it('prevents duplicate lifecycle writes and modal dismissal during submission', async () => {
  await mount('/my/requests', 1); await click('Tutup request'); await input('close_reason', 'Alasan saya')
  let finish: (response: Response) => void = () => {}
  writeHandler = () => new Promise(resolve => { finish = resolve })
  await click('Ya, tutup request'); await click('Ya, tutup request')
  expect(writes()).toHaveLength(1)
  const dialog = container.querySelector('dialog[open]')!
  await act(async () => dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
  expect(dialog.hasAttribute('open')).toBe(true)
  await act(async () => finish(ok({ ...fixture, status: 'CLOSED' }))); await settle()
})
it('keeps lifecycle drafts on window focus and provides a reservations link', async () => {
  await mount('/my/requests', 1); await click('Tutup request'); await input('close_reason', 'Jangan hilang')
  await act(async () => window.dispatchEvent(new Event('focus'))); await settle()
  expect(container.querySelector<HTMLTextAreaElement>('[name="close_reason"]')!.value).toBe('Jangan hilang')
  expect(container.querySelector('a[href="/reservations?source_type=REQUEST_OFFER"]')).not.toBeNull()
})
it('hides lifecycle actions from a non-owner and retains regular staff access', async () => {
  await mount('/requests/7', 2)
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Tutup request')).toBe(false)
})
it('allows staff closure through the regular request route', async () => {
  await mount('/requests/7', 2, 200, true); await click('Tutup request'); await input('close_reason', 'Staff menutup'); await click('Ya, tutup request')
  expect(writes()[0].url.pathname).toBe('/api/v1/requests/7/close/')
})
it('does not offer close for terminal, expired, archived, or fully fulfilled requests', () => {
  expect(canCloseRequest({ ...fixture, status: 'ALLOCATED' })).toBe(true)
  for (const status of ['CLOSED', 'EXPIRED', 'FULFILLED']) expect(canCloseRequest({ ...fixture, status })).toBe(false)
  expect(canCloseRequest({ ...fixture, valid_until: '2020-01-01T00:00:00Z' })).toBe(false)
  expect(canCloseRequest({ ...fixture, archived_at: '2026-10-01T00:00:00Z' })).toBe(false)
  expect(canCloseRequest({ ...fixture, quantity_fulfilled: fixture.quantity_needed })).toBe(false)
})
it('clears private owner history immediately after logout', async () => {
  await mount('/my/requests', 1); await click('Logout test')
  expect(router.state.location.pathname).toBe('/login')
  expect(container.querySelector('a[href="/requests/7"]')).toBeNull()
})
it('returns to page one when a successful delete removes the last history page', async () => {
  await mount('/my/requests?page=2', 1)
  listHandler = url => url.searchParams.get('page') === '2' ? Promise.resolve(failure(404, 'page_not_found')) : Promise.resolve(ok({ count: 20, next: null, previous: null, results: [{ ...fixture, id: 8 }] }))
  await click('Hapus / arsipkan'); await click('Ya, hapus / arsipkan'); await settle()
  expect(router.state.location.search).not.toContain('page=2')
  expect(container.textContent).toContain('Halaman 1')
  expect(container.querySelector('a[href="/requests/8"]')).not.toBeNull()
  expect(container.textContent).not.toContain('Halaman hasil tidak ditemukan')
})
