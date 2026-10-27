import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAuth from '../../auth/RequireAuth.tsx'
import { setCsrfToken } from '../../services/api.ts'
import type { Listing } from '../../services/listings.ts'
import type { ReferenceData } from '../../services/reference.ts'
import BrowseSupply from './BrowseSupply.tsx'
import SupplyDetail from './SupplyDetail.tsx'
import { claimable } from './model.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const food = 'PACKAGED_FOOD_SURPLUS'
const waste = 'COMPOSTABLE_FOOD_WASTE'
const references: ReferenceData = {
  categories: [{ code: 'prepared_meal', label: 'Makanan siap konsumsi', resource_type: food }, { code: 'coffee_grounds', label: 'Ampas kopi', resource_type: waste }],
  units: [{ code: 'box', label: 'Box', allows_decimal: false, max_decimal_places: 0 }, { code: 'kg', label: 'Kilogram', allows_decimal: true, max_decimal_places: 3 }],
  resource_types: [{ code: food, label: 'Makanan kemasan' }, { code: waste, label: 'Sisa organik' }],
  suitabilities: [{ code: 'HUMAN_CONSUMPTION', label: 'Konsumsi manusia' }, { code: 'COMPOSTING', label: 'Kompos' }],
  modes: [{ code: 'DONATE', label: 'Donasi' }, { code: 'SELL', label: 'Jual' }],
}
const pickup = { label: 'Kampus UI Depok', area: 'Depok', latitude: -6.36, longitude: 106.82 }
const fixture: Listing = {
  id: 7, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', version: 1,
  resource_type: food, title: 'Nasi kotak surplus', category: 'prepared_meal', description: 'Nasi ayam baru dimasak',
  quantity_total: '10.000', quantity_available: '7.000', quantity_allocated: '3.000', quantity_completed: '0.000',
  unit: 'box', mode: 'DONATE', unit_price: '0.00', condition: 'Baru dikemas', suitability: ['HUMAN_CONSUMPTION'],
  location: pickup, available_until: '2099-11-01T17:30:45+07:00', owner: { id: 1, display_name: 'Rani' },
  status: 'AVAILABLE', archived_at: null, storage_notes: null, allergen_notes: null, packaging_status: null,
}
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let listing: Listing
let writeStatus: number
let writeCode: string
let detailStatus: number
let referenceStatus: number
let csrfStatus: number
let listResponse: ((url: URL) => Promise<Response>) | undefined
let requests: { url: URL; method: string; body: Record<string, unknown> | null; csrf: string | null; credentials: RequestCredentials | undefined }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error', field: string | null = null) => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field, code, message: field ? 'Jumlah ditolak server.' : 'Secret traceback' }] }, { status })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path = '/supply', userId: number | null = null, referenceResponseStatus = 200) {
  listing = structuredClone(fixture); writeStatus = 200; writeCode = 'invalid'; detailStatus = 200; referenceStatus = referenceResponseStatus; csrfStatus = 200; listResponse = undefined; requests = []
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(path, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    requests.push({ url, method, body, csrf: options.headers.get('X-CSRFToken'), credentials: options.credentials })
    if (url.pathname.endsWith('session/')) return ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Rani' } })
    if (url.pathname.endsWith('csrf/')) return csrfStatus === 200 ? ok({ csrf_token: 'supply-token' }) : failed(csrfStatus, 'csrf_failed')
    if (url.pathname.endsWith('reference-data/')) return referenceStatus === 200 ? ok(references) : failed(referenceStatus)
    if (url.pathname.endsWith('locations/search/')) return ok({ results: [{ ...pickup, attribution: '© OpenStreetMap contributors' }] })
    if (url.pathname.endsWith('listings/') && method === 'GET') return listResponse ? listResponse(url) : ok({ count: 21, next: '/api/v1/listings/?page=2', previous: null, results: [listing] })
    if (/\/listings\/(?:\d+)\/$/.test(url.pathname) && method === 'GET') return detailStatus === 200 ? ok({ ...listing, whatsapp_number: '+6281212341234', email: 'hidden@example.test' }) : failed(detailStatus)
    if (['POST', 'PATCH'].includes(method)) {
      if (writeStatus >= 400) return failed(writeStatus, writeCode, writeStatus === 400 ? 'quantity_total' : null)
      listing = { ...listing, ...body }
      return ok(listing)
    }
    throw new Error(`Unexpected request ${method} ${path}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><Outlet /></AuthProvider>, children: [
      { path: '/supply', element: <BrowseSupply /> }, { path: '/supply/:id', element: <SupplyDetail /> },
      { element: <RequireAuth />, children: [
        { path: '/supply/:id/claim', element: <p>Claim task</p> },
      ] },
      { path: '/login', element: <h1>Masuk</h1> },
    ],
  }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
}
async function input(selector: string, value: string) {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  await act(async () => {
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function select(selector: string, value: string) {
  const element = container.querySelector<HTMLSelectElement>(selector)!
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function click(text: string) {
  const element = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text || item.getAttribute('aria-label') === text)!
  expect(element, `Button ${text}`).toBeDefined()
  await act(async () => element.click())
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
afterEach(async () => {
  await act(async () => root?.unmount()); router?.dispose(); container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); setCsrfToken(null)
})

it('loads public listings with filters from the URL, decimal-safe quantity and safe public fields', async () => {
  await mount('/supply?q=nasi&area=Depok&mode=DONATE&ordering=created_at&scope=mine&status=CLOSED')
  const request = requests.find(item => item.url.pathname.endsWith('listings/'))!
  expect(request.url.searchParams.get('q')).toBe('nasi')
  expect(request.url.searchParams.get('area')).toBe('Depok')
  expect(request.url.searchParams.get('ordering')).toBe('created_at')
  expect(request.url.searchParams.has('scope')).toBe(false)
  expect(request.url.searchParams.has('status')).toBe(false)
  expect(container.textContent).toContain('7 box tersedia')
  expect(container.querySelector('a[href="/supply/7"]')).not.toBeNull()
  expect(container.textContent).not.toContain('hidden@example.test')
  expect(request.credentials).toBe('include')
})
it('paginates and resets the page on search, applying and resetting filters', async () => {
  await mount('/supply?page=2')
  await input('[name="q"]', 'roti'); await submit()
  expect(router.state.location.search).toBe('?q=roti')
  await click('Berikutnya'); expect(router.state.location.search).toContain('page=2')
  await select('aside select', food); await click('Terapkan filter')
  expect(router.state.location.search).toContain(`resource_type=${food}`)
  await click('Reset'); expect(router.state.location.search).toBe('')
})
it('ignores late results from an aborted search and supports browser back', async () => {
  await mount()
  let resolveOld: (response: Response) => void = () => {}
  listResponse = url => url.searchParams.get('q') === 'old' ? new Promise(resolve => { resolveOld = resolve }) : Promise.resolve(ok({ count: 0, next: null, previous: null, results: [] }))
  await act(async () => { await router.navigate('/supply?q=old') })
  await act(async () => { await router.navigate('/supply?q=new') })
  await act(async () => resolveOld(ok({ count: 1, next: null, previous: null, results: [{ ...listing, title: 'Stale supply' }] })))
  expect(container.textContent).not.toContain('Stale supply')
  expect(container.textContent).toContain('Belum ada supply yang sesuai')
  await act(async () => { await router.navigate(-1) })
  expect(container.querySelector<HTMLInputElement>('[name="q"]')!.value).toBe('old')
})
it('does not send invalid short URL searches', async () => {
  await mount('/supply?q=a')
  expect(requests.some(item => item.url.pathname.endsWith('listings/'))).toBe(false)
  expect(container.textContent).toContain('Pencarian tidak valid')
})
it('handles unavailable filters independently, and retries a 501 listing response', async () => {
  await mount('/supply', null, 501)
  expect(container.textContent).toContain('Pilihan filter belum tersedia')
  expect(container.textContent).toContain('Nasi kotak surplus')
  listResponse = async () => failed(501)
  await act(async () => { await router.navigate('/supply?area=Depok') })
  expect(container.textContent).toContain('Layanan supply belum tersedia')
  listResponse = undefined; await click('Coba lagi')
  expect(container.textContent).toContain('Nasi kotak surplus')
})
it('keeps the guest claim destination and never renders private contact data', async () => {
  await mount('/supply/7')
  expect(container.textContent).toContain('Belum ada foto')
  expect(container.textContent).not.toContain('hidden@example.test')
  expect(container.textContent).not.toContain('+6281212341234')
  const claim = container.querySelector<HTMLAnchorElement>('a[href="/login"]')!
  await act(async () => claim.click())
  expect(router.state.location.state).toEqual({ from: '/supply/7/claim' })
})
it('offers edit to the owner and prevents self-claim', async () => {
  await mount('/supply/7', 1)
  expect(container.querySelector('a[href="/supply/7/edit"]')).not.toBeNull()
  expect(container.querySelector('a[href="/supply/7/claim"]')).toBeNull()

})
it.each([404, 501, 500])('shows a safe detail error for %s', async status => {
  await mount('/supply')
  detailStatus = status; await act(async () => { await router.navigate('/supply/7') }); await settle()
  expect(container.textContent).toContain('Supply belum dapat dibuka')
  expect(container.textContent).not.toContain('Internal secret')
})
it('disables expired, empty, archived and terminal supply claims', () => {
  for (const patch of [{ available_until: '2020-01-01T00:00:00Z' }, { quantity_available: '0.000' }, { archived_at: '2026-10-01T00:00:00Z' }, { status: 'CLOSED' }, { status: 'COMPLETED' }]) expect(claimable({ ...fixture, ...patch })).toBe(false)
})
it('renders the expired state and prevents navigation to claim', async () => {
  await mount()
  listing.available_until = '2020-01-01T00:00:00Z'
  await act(async () => { await router.navigate('/supply/7') }); await settle()
  expect(container.textContent).toContain('Kedaluwarsa')
  expect(container.querySelector('a[href="/login"]')).toBeNull()
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Supply tidak tersedia' && button.disabled)).toBe(true)
})
it('applies mobile sheet filters and discards an unapplied selection on closing', async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
  await mount('/supply?page=2')
  await click('Filter')
  await select('dialog select', food)
  await click('Tutup')
  expect(router.state.location.search).toBe('?page=2')
  await click('Filter')
  expect(container.querySelector<HTMLSelectElement>('dialog select')!.value).toBe('')
  await select('dialog select', waste)
  await click('Terapkan filter')
  expect(router.state.location.search).toContain(`resource_type=${waste}`)
  expect(router.state.location.search).not.toContain('page=')
  expect(container.querySelector<HTMLDialogElement>('dialog')!.open).toBe(false)
})
