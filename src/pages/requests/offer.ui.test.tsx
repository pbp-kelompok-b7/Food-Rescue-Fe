import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAuth from '../../auth/RequireAuth.tsx'
import { setCsrfToken } from '../../services/api.ts'
import type { ResourceRequest } from '../../services/requests.ts'
import type { ReferenceData } from '../../services/reference.ts'
import OfferForm from './OfferForm.tsx'

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
const pickup = { label: 'Kopi Pojok, Beji', area: 'Depok', latitude: -6.37, longitude: 106.83 }
const fixture: ResourceRequest = {
  id: 14, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', version: 1,
  resource_type: waste, category: 'coffee_grounds', intended_use: 'COMPOSTING',
  quantity_needed: '10.000', unit: 'kg', location: { label: 'Beji', area: 'Depok', latitude: -6.37, longitude: 106.83 },
  donate_only: true, max_unit_price: null, valid_until: '2099-11-01T15:00:00+07:00',
  owner: { id: 1, display_name: 'Komunitas Berbagi' }, status: 'OPEN',
  quantity_remaining: '10.000', quantity_allocated: '0.000', quantity_fulfilled: '0.000', archived_at: null,
}
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let request: ResourceRequest
let detailStatus: number
let offerStatus: number
let offerCode: string
let requests: { url: URL; method: string; body: Record<string, unknown> | null; csrf: string | null; credentials: RequestCredentials | undefined }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error', field: string | null = null) => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field, code, message: field ? 'Jumlah ditolak server.' : 'Secret traceback' }] }, { status })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(userId: number | null = 2, overrides: Partial<ResourceRequest> = {}, detailResponseStatus = 200) {
  request = { ...structuredClone(fixture), ...overrides }; detailStatus = detailResponseStatus; offerStatus = 201; offerCode = 'invalid'; requests = []
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(path, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    requests.push({ url, method, body, csrf: options.headers.get('X-CSRFToken'), credentials: options.credentials })
    if (url.pathname.endsWith('session/')) return ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Dapur Bu Rani' } })
    if (url.pathname.endsWith('csrf/')) return ok({ csrf_token: 'offer-token' })
    if (url.pathname.endsWith('reference-data/')) return ok(references)
    if (url.pathname.endsWith('locations/search/')) return ok({ results: [{ ...pickup, attribution: '© OpenStreetMap contributors' }] })
    if (/\/requests\/\d+\/$/.test(url.pathname) && method === 'GET') return detailStatus === 200 ? ok(request) : failed(detailStatus)
    if (/\/requests\/\d+\/offers\/$/.test(url.pathname) && method === 'POST') return offerStatus >= 400 ? failed(offerStatus, offerCode, offerStatus === 400 ? 'quantity' : null) : ok({ id: 88, status: 'PENDING' })
    throw new Error(`Unexpected request ${method} ${path}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><Outlet /></AuthProvider>, children: [
      { element: <RequireAuth />, children: [{ path: '/requests/:id/offer', element: <OfferForm /> }] },
      { path: '/reservations/:id', element: <h1>Reservation detail</h1> },
      { path: '/requests/:id', element: <h1>Request detail</h1> },
      { path: '/login', element: <h1>Masuk</h1> },
    ],
  }], { initialEntries: ['/requests/14/offer'] })
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
const offers = () => requests.filter(item => /\/offers\/$/.test(item.url.pathname))
async function pickLocation() { await input('[type="search"]', 'Kopi Pojok'); await click('Cari lokasi'); await click('Pilih') }
async function completeOffer() {
  await input('[name="title"]', 'Ampas kopi dari kedai')
  await input('[name="description"]', 'Ampas kopi kering')
  await input('[name="condition"]', 'Lembap, tanpa plastik')
  await input('[name="quantity"]', '2')
  await input('[name="resource_deadline"]', '2099-10-16T15:00')
  await pickLocation()
}
afterEach(async () => {
  await act(async () => root?.unmount()); router?.dispose(); container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); setCsrfToken(null)
})

it('shows the request remaining, use, donate-only and does not ask for type/unit/listing_id', async () => {
  await mount()
  expect(container.textContent).toContain('sisa 10 kg')
  expect(container.textContent).toContain('donasi saja')
  expect(container.textContent).toContain('Bahan organik · Ampas kopi')
  // donate-only hides the price/mode controls; unit is read-only (request's).
  expect(container.querySelector('[name="mode"]')).toBeNull()
  expect(container.querySelector<HTMLInputElement>('[name="unit"]')!.disabled).toBe(true)
  expect(container.querySelector<HTMLInputElement>('[name="unit"]')!.value).toBe('kg')
})
it('submits a valid donate offer with inherited type/category/unit/suitability and no listing_id', async () => {
  await mount()
  await completeOffer(); await submit()
  expect(offers()).toHaveLength(1)
  const body = offers()[0].body!
  expect(body).toMatchObject({ resource_type: waste, category: 'coffee_grounds', unit: 'kg', mode: 'DONATE', unit_price: '0.00', quantity: '2', suitability: ['COMPOSTING'], location: pickup, resource_deadline: '2099-10-16T15:00:00+07:00' })
  expect(body).not.toHaveProperty('listing_id')
  expect(offers()[0].csrf).toBe('offer-token')
  expect(router.state.location.pathname).toBe('/reservations/88')
})
it('blocks a quantity above the remaining need before sending', async () => {
  await mount()
  await completeOffer(); await input('[name="quantity"]', '12'); await submit()
  expect(offers()).toHaveLength(0)
  expect(container.textContent).toContain('Maksimal 10 kg tersisa')
})
it('rejects a fractional quantity for a whole-number unit', async () => {
  await mount(2, { unit: 'box', resource_type: food, category: 'prepared_meal', intended_use: 'HUMAN_CONSUMPTION' })
  await completeOffer(); await input('[name="quantity"]', '2.5'); await submit()
  expect(offers()).toHaveLength(0)
  expect(container.textContent).toContain('bilangan bulat')
})
it('enforces donate-only by never offering a SELL control', async () => {
  await mount()
  expect(container.querySelector('[name="mode"]')).toBeNull()
  expect(container.querySelector('[name="unit_price"]')).toBeNull()
})
it('caps SELL price at the request max_unit_price', async () => {
  await mount(2, { donate_only: false, max_unit_price: '5000.00' })
  await completeOffer()
  await select('[name="mode"]', 'SELL')
  await input('[name="unit_price"]', '9000'); await submit()
  expect(offers()).toHaveLength(0)
  expect(container.textContent).toContain('tidak boleh melebihi')
})
it('submits a SELL offer within the price cap', async () => {
  await mount(2, { donate_only: false, max_unit_price: '5000.00' })
  await completeOffer()
  await select('[name="mode"]', 'SELL')
  await input('[name="unit_price"]', '4000'); await submit()
  expect(offers()[0].body).toMatchObject({ mode: 'SELL', unit_price: '4000' })
})
it('prevents offering to an expired request', async () => {
  await mount(2, { valid_until: '2020-01-01T00:00:00Z' })
  expect(container.textContent).toContain('kedaluwarsa')
  expect(container.querySelector<HTMLFieldSetElement>('form fieldset')!.disabled).toBe(true)
  await submit()
  expect(offers()).toHaveLength(0)
})
it('prevents the request owner from offering', async () => {
  await mount(1)
  expect(container.textContent).toContain('request milikmu')
  expect(container.querySelector<HTMLFieldSetElement>('form fieldset')!.disabled).toBe(true)
  await submit()
  expect(offers()).toHaveLength(0)
})
it('requires a selected location before sending', async () => {
  await mount()
  await input('[name="title"]', 'Ampas kopi')
  await input('[name="description"]', 'Kering')
  await input('[name="condition"]', 'Bersih')
  await input('[name="quantity"]', '2')
  await input('[name="resource_deadline"]', '2099-10-16T15:00')
  await submit()
  expect(offers()).toHaveLength(0)
  expect(container.textContent).toContain('Cari dan pilih lokasi resource')
})
it.each([[409, 'self_transaction', 'milikmu sendiri'], [409, 'source_not_accepting', 'tidak menerima penawaran'], [409, 'terms_mismatch', 'tidak sesuai'], [409, 'insufficient_quantity', 'melebihi sisa']])('shows a safe message for %s %s', async (status, code, text) => {
  await mount()
  offerStatus = status as number; offerCode = code as string
  await completeOffer(); await submit()
  expect(router.state.location.pathname).toBe('/requests/14/offer')
  expect(container.textContent).toContain(text as string)
  expect(container.textContent).not.toContain('Internal secret')
})
it('maps a 400 server field error onto the quantity field', async () => {
  await mount()
  offerStatus = 400
  await completeOffer(); await submit()
  expect(container.textContent).toContain('Jumlah ditolak server.')
})
it('prevents double submission while the offer is pending', async () => {
  await mount()
  await completeOffer()
  await act(async () => {
    const form = container.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(offers()).toHaveLength(1)
})
it('redirects an expired write session to login with the offer destination', async () => {
  await mount()
  offerStatus = 401
  await completeOffer(); await submit()
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/requests/14/offer' })
})
it.each([404, 501, 500])('shows a safe detail error for %s', async status => {
  await mount(2, {}, status)
  expect(container.textContent).toContain('Request belum dapat dibuka')
  expect(container.textContent).not.toContain('Internal secret')
})
