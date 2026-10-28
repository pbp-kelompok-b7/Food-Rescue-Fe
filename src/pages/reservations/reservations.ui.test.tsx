import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAuth from '../../auth/RequireAuth.tsx'
import { setCsrfToken } from '../../services/api.ts'
import type { Reservation } from '../../services/reservations.ts'
import ReservationInbox from './ReservationInbox.tsx'
import ReservationDetail from './ReservationDetail.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const pickup = { label: 'Kampus UI Depok', area: 'Depok', latitude: -6.36, longitude: 106.82 }
const terms = {
  resource_type: 'PACKAGED_FOOD_SURPLUS', title: 'Nasi kotak surplus', category: 'prepared_meal', description: 'Nasi ayam',
  condition: 'Baru dikemas', suitability: ['HUMAN_CONSUMPTION'], location: pickup, storage_notes: null, allergen_notes: null, packaging_status: null,
  quantity: '4.000', unit: 'box', mode: 'DONATE' as const, unit_price: '0.00', total_price: '0.00', resource_deadline: '2099-11-01T17:30:45+07:00',
}
// Viewer (id 2) is the provider for this claim -> viewer is the approver.
const base: Reservation = {
  id: 24, created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-02T00:00:00Z', version: 1,
  source_type: 'LISTING_CLAIM', listing_id: 101, request_id: null,
  provider: { id: 2, display_name: 'Dapur Bu Rani' }, receiver: { id: 3, display_name: 'Komunitas Berbagi' }, submitted_by_id: 3,
  status: 'PENDING', terms, accepted_snapshot: null, accepted_at: null, reason: null, cancellation_code: null, pickup: null, counterparty_contact: null,
}
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let listResponse: (url: URL) => Response
let detail: Reservation
let detailStatus: number
let whatsappNumber: string | null
let requests: { url: URL; method: string }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error') => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field: null, code, message: 'Secret traceback' }] }, { status })
const pageOf = (results: Reservation[], next: string | null = null) => ok({ count: results.length, next, previous: null, results })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path: string, userId: number | null = 2, detailResponseStatus = 200, overrides: Partial<Reservation> = {}, listOverride?: (url: URL) => Response) {
  detail = { ...structuredClone(base), ...overrides }; detailStatus = detailResponseStatus; whatsappNumber = null; requests = []
  listResponse = listOverride || (() => pageOf([base]))
  vi.stubGlobal('fetch', vi.fn(async (input: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(input, 'http://localhost')
    const method = options.method || 'GET'
    requests.push({ url, method })
    if (url.pathname.endsWith('session/')) return ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Dapur Bu Rani', whatsapp_number: whatsappNumber } })
    if (url.pathname.endsWith('csrf/')) return ok({ csrf_token: 'tok' })
    if (url.pathname.endsWith('reservations/') && method === 'GET') return listResponse(url)
    if (/\/reservations\/\d+\/$/.test(url.pathname) && method === 'GET') return detailStatus === 200 ? ok(detail) : failed(detailStatus)
    throw new Error(`Unexpected request ${method} ${input}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><Outlet /></AuthProvider>, children: [
      { element: <RequireAuth />, children: [
        { path: '/reservations', element: <ReservationInbox /> },
        { path: '/reservations/:id', element: <ReservationDetail /> },
        { path: '/reservations/:id/edit', element: <h1>Edit reservation</h1> },
      ] },
      { path: '/login', element: <h1>Masuk</h1> },
      { path: '/supply', element: <h1>Browse supply</h1> },
      { path: '/requests', element: <h1>Papan request</h1> },
    ],
  }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
}
async function select(selector: string, value: string) {
  const element = container.querySelector<HTMLSelectElement>(selector)!
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function click(text: string) {
  const element = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)!
  await act(async () => element.click())
}
afterEach(async () => {
  await act(async () => root?.unmount()); router?.dispose(); container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); setCsrfToken(null)
})

// --- Inbox ---
it('lists reservations with ref, role, status, claim/offer and follow-up', async () => {
  await mount('/reservations')
  expect(container.textContent).toContain('RSV-024')
  expect(container.textContent).toContain('Claim listing')
  expect(container.textContent).toContain('Nasi kotak surplus')
  expect(container.textContent).toContain('4 box · Donasi')
  // Viewer is provider+approver of this claim -> "Tinjau claim" + request follow-up.
  expect(container.textContent).toContain('Komunitas Berbagi meminta 4 box')
  expect([...container.querySelectorAll('a')].some(a => a.textContent === 'Tinjau claim')).toBe(true)
})
it('sends deep-linkable filters to the API and updates the URL', async () => {
  await mount('/reservations?role=provider&status=PENDING&source_type=LISTING_CLAIM')
  const request = requests.find(item => item.url.pathname.endsWith('reservations/'))!
  expect(request.url.searchParams.get('role')).toBe('provider')
  expect(request.url.searchParams.get('status')).toBe('PENDING')
  expect(request.url.searchParams.get('source_type')).toBe('LISTING_CLAIM')
  await select('select', 'receiver')
  expect(router.state.location.search).toContain('role=receiver')
})
it('shows an empty state when there are no reservations', async () => {
  await mount('/reservations')
  await act(async () => { listResponse = () => pageOf([]); await router.navigate('/reservations?status=ACCEPTED') }); await settle()
  expect(container.textContent).toContain('Belum ada reservasi')
})
it('paginates when the API reports a next page', async () => {
  await mount('/reservations', 2, 200, {}, url => url.searchParams.get('page') === '2' ? pageOf([{ ...base, id: 25 }]) : pageOf([base], '/api/v1/reservations/?page=2'))
  await click('Berikutnya')
  expect(router.state.location.search).toContain('page=2')
})
it('shows a safe inbox error', async () => {
  await mount('/reservations', 2, 200, {}, () => failed(500))
  expect(container.textContent).toContain('Reservasi belum dapat dimuat')
  expect(container.textContent).not.toContain('Internal secret')
})

// --- Detail ---
it('shows terms, total price for SELL, version and the submitter edit link', async () => {
  await mount('/reservations/24', 3) // viewer is the receiver/submitter
  expect(container.textContent).toContain('RSV-024')
  expect(container.textContent).toContain('4 box')
  expect(container.textContent).toContain('v1')
  expect([...container.querySelectorAll('a')].some(a => a.textContent === 'Ubah jumlah' && a.getAttribute('href') === '/reservations/24/edit')).toBe(true)
})
it('does not offer edit to the approver (non-submitter)', async () => {
  await mount('/reservations/24', 2) // viewer is provider/approver, not submitter
  expect([...container.querySelectorAll('a')].some(a => a.textContent === 'Ubah jumlah')).toBe(false)
})
it('reveals the WhatsApp link only when ACCEPTED and number is present', async () => {
  await mount('/reservations/24', 2, 200, { status: 'ACCEPTED', accepted_at: '2026-10-03T00:00:00Z', version: 2, accepted_snapshot: terms, counterparty_contact: { user_id: 3, whatsapp_number: '+6281234567890', whatsapp_url: null } })
  const wa = [...container.querySelectorAll('a')].find(a => a.getAttribute('href')?.startsWith('https://wa.me/'))
  expect(wa).toBeDefined()
  expect(wa!.getAttribute('href')).toBe('https://wa.me/6281234567890')
})
it('shows contact as not-yet-available when ACCEPTED but number is missing', async () => {
  await mount('/reservations/24', 2, 200, { status: 'ACCEPTED', accepted_at: '2026-10-03T00:00:00Z', accepted_snapshot: terms, counterparty_contact: null })
  expect(container.textContent).toContain('Belum tersedia')
  expect([...container.querySelectorAll('a')].some(a => a.getAttribute('href')?.startsWith('https://wa.me/'))).toBe(false)
})
it('never leaks contact while PENDING', async () => {
  await mount('/reservations/24', 2, 200, { status: 'PENDING', counterparty_contact: null })
  expect(container.textContent).not.toContain('wa.me')
  expect(container.textContent).toContain('kontak belum dibuka')
})
it('renders the pickup relationship and states it is not payment proof', async () => {
  await mount('/reservations/24', 2, 200, { status: 'ACCEPTED', accepted_at: '2026-10-03T00:00:00Z', accepted_snapshot: terms, pickup: { status: 'COMPLETED', scheduled_at: '2099-10-20T04:00:00Z', location: pickup, instructions: 'Temui di lobi' } })
  expect(container.textContent).toContain('Status pickup')
  expect(container.textContent).toContain('bukan bukti pembayaran')
})
it('keeps terminal history readable (cancelled)', async () => {
  await mount('/reservations/24', 3, 200, { status: 'CANCELLED', reason: 'Jadwal bentrok' })
  expect(container.textContent).toContain('Pengajuan tidak berlanjut')
  expect(container.textContent).toContain('Jadwal bentrok')
})
it.each([404, 401, 500])('shows a safe detail error for %s (outsider/expired/server)', async status => {
  await mount('/reservations/24', 2, status)
  expect(container.textContent).toContain('Reservation belum dapat dibuka')
  expect(container.textContent).not.toContain('Internal secret')
})
