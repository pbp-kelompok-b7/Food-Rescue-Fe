import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAuth from '../../auth/RequireAuth.tsx'
import { setCsrfToken } from '../../services/api.ts'
import type { Listing } from '../../services/listings.ts'
import type { ReferenceData } from '../../services/reference.ts'
import ClaimForm from './ClaimForm.tsx'

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
const reservation = {
  id: 55, created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-02T00:00:00Z', version: 1,
  source_type: 'LISTING_CLAIM', listing_id: 7, request_id: null,
  provider: { id: 1, display_name: 'Rani' }, receiver: { id: 2, display_name: 'Budi' }, submitted_by_id: 2,
  status: 'PENDING', terms: { ...pickup, resource_type: food, title: 'Nasi kotak surplus', category: 'prepared_meal', description: 'Nasi ayam', condition: 'Baru dikemas', suitability: ['HUMAN_CONSUMPTION'], location: pickup, storage_notes: null, allergen_notes: null, packaging_status: null, quantity: '5.000', unit: 'box', mode: 'DONATE', unit_price: '0.00', total_price: '0.00', resource_deadline: '2099-11-01T17:30:45+07:00' },
  accepted_snapshot: null, accepted_at: null, reason: null, cancellation_code: null, pickup: null, counterparty_contact: null,
}
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let listing: Listing
let detailStatus: number
let claimStatus: number
let claimCode: string
let referenceStatus: number
let csrfStatus: number
let requests: { url: URL; method: string; body: Record<string, unknown> | null; csrf: string | null; credentials: RequestCredentials | undefined }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error', field: string | null = null) => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field, code, message: field ? 'Jumlah ditolak server.' : 'Secret traceback' }] }, { status })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path = '/supply/7/claim', userId: number | null = 2, overrides: Partial<Listing> = {}, detailResponseStatus = 200, referenceResponseStatus = 200) {
  listing = { ...structuredClone(fixture), ...overrides }; detailStatus = detailResponseStatus; claimStatus = 201; claimCode = 'invalid'; referenceStatus = referenceResponseStatus; csrfStatus = 200; requests = []
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(path, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    requests.push({ url, method, body, csrf: options.headers.get('X-CSRFToken'), credentials: options.credentials })
    if (url.pathname.endsWith('session/')) return ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Budi' } })
    if (url.pathname.endsWith('csrf/')) return csrfStatus === 200 ? ok({ csrf_token: 'claim-token' }) : failed(csrfStatus, 'csrf_failed')
    if (url.pathname.endsWith('reference-data/')) return referenceStatus === 200 ? ok(references) : failed(referenceStatus)
    if (/\/listings\/\d+\/$/.test(url.pathname) && method === 'GET') return detailStatus === 200 ? ok({ ...listing, whatsapp_number: '+6281200000000', email: 'hidden@example.test' }) : failed(detailStatus)
    if (/\/listings\/\d+\/claims\/$/.test(url.pathname) && method === 'POST') return claimStatus >= 400 ? failed(claimStatus, claimCode, claimStatus === 400 ? 'quantity' : null) : ok(reservation)
    throw new Error(`Unexpected request ${method} ${path}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><Outlet /></AuthProvider>, children: [
      { element: <RequireAuth />, children: [{ path: '/supply/:id/claim', element: <ClaimForm /> }] },
      { path: '/reservations/:id', element: <h1>Reservation detail</h1> },
      { path: '/login', element: <h1>Masuk</h1> },
    ],
  }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
}
async function input(selector: string, value: string) {
  const element = container.querySelector<HTMLInputElement>(selector)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
const claims = () => requests.filter(request => /\/claims\/$/.test(request.url.pathname))
afterEach(async () => {
  await act(async () => root?.unmount()); router?.dispose(); container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); setCsrfToken(null)
})

it('shows provider as approver, listing price and no negotiation field', async () => {
  await mount()
  expect(container.textContent).toContain('Rani')
  expect(container.textContent).toContain('Tersedia 7 box')
  expect(container.textContent).toContain('Cara berbagi')
  expect(container.textContent).not.toContain('hidden@example.test')
  // No price/mode negotiation fields: only the quantity input exists.
  expect(container.querySelectorAll('input').length).toBe(1)
  expect(container.querySelector('[name="quantity"]')).not.toBeNull()
})
it('matches the mobile layout: resource recap line and form before summary', async () => {
  await mount()
  // Mobile-only recap line in the heading (Figma mobile frame): title · qty · sharing.
  const recap = [...container.querySelectorAll('p')].find(p => p.textContent === 'Nasi kotak surplus · 7 box · Donasi')
  expect(recap, 'mobile recap line').toBeDefined()
  expect(recap!.className).toContain('nav:hidden')
  // Mobile shows the form first (order-1) and the summary second (order-2);
  // desktop flips it via the nav: breakpoint. Verify the responsive order classes.
  const form = container.querySelector('form')!
  const summaryHeading = [...container.querySelectorAll('h2')].find(h => h.textContent === 'Nasi kotak surplus')!
  const formCell = form.closest('.grid > *')!
  const summaryCell = summaryHeading.closest('.grid > *')!
  expect(formCell.className).toContain('order-1')
  expect(formCell.className).toContain('nav:order-2')
  expect(summaryCell.className).toContain('order-2')
  expect(summaryCell.className).toContain('nav:order-1')
})
it('submits a partial claim with only quantity, CSRF, and opens the reservation', async () => {
  await mount()
  await input('[name="quantity"]', '5'); await submit()
  expect(claims()).toHaveLength(1)
  expect(claims()[0].body).toEqual({ quantity: '5' })
  expect(claims()[0].csrf).toBe('claim-token')
  expect(claims()[0].credentials).toBe('include')
  expect(router.state.location.pathname).toBe('/reservations/55')
  expect(router.state.location.state).toEqual({ reservationCreated: true })
})
it('submits a full claim up to the available quantity', async () => {
  await mount()
  await input('[name="quantity"]', '7'); await submit()
  expect(claims()[0].body).toEqual({ quantity: '7' })
})
it('blocks a quantity above availability before sending', async () => {
  await mount()
  await input('[name="quantity"]', '8'); await submit()
  expect(claims()).toHaveLength(0)
  expect(container.textContent).toContain('Maksimal 7 box tersedia')
})
it('rejects a fractional claim for a whole-number unit', async () => {
  await mount()
  await input('[name="quantity"]', '2.5'); await submit()
  expect(claims()).toHaveLength(0)
  expect(container.textContent).toContain('bilangan bulat')
})
it('prevents self-claim for the owner and disables submit', async () => {
  await mount('/supply/7/claim', 1)
  expect(container.textContent).toContain('supply milikmu')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')!.disabled).toBe(true)
  await input('[name="quantity"]', '5'); await submit()
  expect(claims()).toHaveLength(0)
})
it('disables claims for an expired listing', async () => {
  await mount('/supply/7/claim', 2, { available_until: '2020-01-01T00:00:00Z' })
  expect(container.textContent).toContain('kedaluwarsa')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')!.disabled).toBe(true)
})
it.each([[409, 'self_transaction', 'milikmu sendiri'], [409, 'source_not_accepting', 'tidak menerima claim'], [409, 'insufficient_quantity', 'melebihi yang tersedia']])('shows a safe message for %s %s and stays on the page', async (status, code, text) => {
  await mount()
  claimStatus = status as number; claimCode = code as string
  await input('[name="quantity"]', '5'); await submit()
  expect(router.state.location.pathname).toBe('/supply/7/claim')
  expect(container.textContent).toContain(text as string)
  expect(container.textContent).not.toContain('Internal secret')
})
it('shows a server field error for a 400 and keeps the entered quantity', async () => {
  await mount()
  claimStatus = 400
  await input('[name="quantity"]', '5'); await submit()
  expect(container.textContent).toContain('Jumlah ditolak server.')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')!.value).toBe('5')
})
it('prevents double submission while the claim is pending', async () => {
  await mount()
  await input('[name="quantity"]', '5')
  await act(async () => {
    const form = container.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(claims()).toHaveLength(1)
})
it('redirects an expired write session to login with the claim destination', async () => {
  await mount()
  claimStatus = 401
  await input('[name="quantity"]', '5'); await submit()
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/supply/7/claim' })
})
it.each([404, 501, 500])('shows a safe detail error for %s', async status => {
  await mount('/supply/7/claim', 2, {}, status)
  expect(container.textContent).toContain('Supply belum dapat dibuka')
  expect(container.textContent).not.toContain('Internal secret')
})

it('recovers a failed reference lookup without reloading the claim page', async () => {
  await mount('/supply/7/claim', 2, {}, 200, 503)
  expect(container.textContent).toContain('Pilihan resource belum tersedia')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')?.disabled).toBe(true)
  await submit()
  expect(claims()).toHaveLength(0)
  referenceStatus = 200
  const retry = [...container.querySelectorAll('button')].find(button => button.textContent === 'Muat pilihan resource')!
  await act(async () => retry.click()); await settle()
  expect(container.textContent).not.toContain('Pilihan resource belum tersedia')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')?.disabled).toBe(false)
  await input('[name="quantity"]', '2'); await submit()
  expect(claims()).toHaveLength(1)
  expect(claims()[0].body).toEqual({ quantity: '2' })
})
