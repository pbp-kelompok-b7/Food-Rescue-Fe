import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import { useAuth } from '../../auth/useAuth.ts'
import { acceptingOffers, budgetText } from './model.ts'
import type { ResourceRequest } from '../../services/requests.ts'
import BrowseRequests from './BrowseRequests.tsx'
import RequestDetail from './RequestDetail.tsx'

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
let calls: { url: URL; method: string; signal: AbortSignal | null | undefined; credentials: RequestCredentials | undefined }[]
function SessionControls() { const auth = useAuth(); return <><button onClick={auth.clearSession}>Logout test</button><Outlet /></> }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path = '/requests', viewer: number | null = null, referenceResponseStatus = 200) {
  request = structuredClone(fixture); detailStatus = 200; listStatus = 200; referenceStatus = referenceResponseStatus; sessionStatus = 200; userId = viewer; listResults = [request]; calls = []; listHandler = undefined; detailHandler = undefined
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit) => {
    const url = new URL(path, 'http://localhost')
    calls.push({ url, method: options.method || 'GET', signal: options.signal, credentials: options.credentials })
    if (url.pathname.endsWith('session/')) return sessionStatus === 200 ? ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Viewer' } }) : failure(sessionStatus)
    if (url.pathname.endsWith('reference-data/')) return referenceStatus === 200 ? ok(references) : failure(referenceStatus)
    if (url.pathname.endsWith('requests/')) return listHandler ? listHandler(url) : listStatus === 200 ? ok({ count: listResults.length ? 21 : 0, next: listResults.length ? '/api/v1/requests/?page=2' : null, previous: url.searchParams.get('page') === '2' ? '/api/v1/requests/?page=1' : null, results: listResults.map(value => ({ ...value, whatsapp_number: '+628120000000', email: 'private@example.test' })) }) : failure(listStatus, listStatus === 404 ? 'page_not_found' : 'server_error')
    if (/\/requests\/\d+\/$/.test(url.pathname)) return detailHandler ? detailHandler() : detailStatus === 200 ? ok({ ...request, whatsapp_number: '+628120000000', email: 'private@example.test' }) : failure(detailStatus)
    throw new Error(`Unexpected request ${url.pathname}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{ element: <AuthProvider><SessionControls /></AuthProvider>, children: [
    { path: '/requests', element: <BrowseRequests /> }, { path: '/requests/:id', element: <RequestDetail /> },
    { path: '/login', element: <h1>Masuk</h1> }, { path: '/requests/:id/offer', element: <h1>Form offer</h1> },
  ] }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
}
async function click(text: string) {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)!
  expect(button, text).toBeDefined(); await act(async () => button.click()); await settle()
}
async function select(name: string, value: string) {
  const element = container.querySelector<HTMLSelectElement>(`[name="${name}"]`)!
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function input(name: string, value: string) {
  const element = container.querySelector<HTMLInputElement>(`[name="${name}"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); await settle() }
const listCalls = () => calls.filter(item => item.url.pathname.endsWith('requests/'))
afterEach(async () => { await act(async () => root?.unmount()); router?.dispose(); container?.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

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
  expect(container.textContent).toContain('tanpa membuat listing publik')
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
  expect(container.textContent).toContain('Ditutup')
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
