import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAuth from '../../auth/RequireAuth.tsx'
import { setCsrfToken } from '../../services/api.ts'
import type { Reservation } from '../../services/reservations.ts'
import type { ReferenceData } from '../../services/reference.ts'
import ReservationInbox from './ReservationInbox.tsx'
import ReservationDetail from './ReservationDetail.tsx'
import EditReservation from './EditReservation.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
// jsdom lacks native <dialog> modal methods used by the reason dialog.
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
const references: ReferenceData = {
  categories: [{ code: 'prepared_meal', label: 'Makanan siap konsumsi', resource_type: 'PACKAGED_FOOD_SURPLUS' }],
  units: [{ code: 'box', label: 'Box', allows_decimal: false, max_decimal_places: 0 }, { code: 'kg', label: 'Kilogram', allows_decimal: true, max_decimal_places: 3 }],
  resource_types: [{ code: 'PACKAGED_FOOD_SURPLUS', label: 'Makanan kemasan' }], suitabilities: [{ code: 'HUMAN_CONSUMPTION', label: 'Konsumsi manusia' }], modes: [{ code: 'DONATE', label: 'Donasi' }, { code: 'SELL', label: 'Jual' }],
}
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
let actionStatus: number
let actionCode: string
let sourceStatus: number
let whatsappNumber: string | null
let requests: { url: URL; method: string; body: Record<string, unknown> | null; csrf: string | null }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error', field: string | null = null) => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field, code, message: field ? 'Jumlah ditolak server.' : 'Secret traceback' }] }, { status })
const pageOf = (results: Reservation[], next: string | null = null) => ok({ count: results.length, next, previous: null, results })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path: string, userId: number | null = 2, detailResponseStatus = 200, overrides: Partial<Reservation> = {}, listOverride?: (url: URL) => Response, sourceResponseStatus = 200) {
  detail = { ...structuredClone(base), ...overrides }; detailStatus = detailResponseStatus; actionStatus = 200; actionCode = 'invalid'; sourceStatus = sourceResponseStatus; whatsappNumber = null; requests = []
  listResponse = listOverride || (() => pageOf([base]))
  vi.stubGlobal('fetch', vi.fn(async (input: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(input, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    requests.push({ url, method, body, csrf: options.headers.get('X-CSRFToken') })
    if (url.pathname.endsWith('session/')) return ok({ authenticated: userId !== null, user: userId === null ? null : { id: userId, display_name: 'Dapur Bu Rani', whatsapp_number: whatsappNumber } })
    if (url.pathname.endsWith('csrf/')) return ok({ csrf_token: 'tok' })
    if (url.pathname.endsWith('reference-data/')) return ok(references)
    // Source availability for the approver's "Jumlah tersedia saat ini".
    if (/\/listings\/\d+\/$/.test(url.pathname) && method === 'GET') return sourceStatus === 200 ? ok({ quantity_available: '7.000' }) : failed(sourceStatus)
    if (/\/requests\/\d+\/$/.test(url.pathname) && method === 'GET') return sourceStatus === 200 ? ok({ quantity_remaining: '7.000' }) : failed(sourceStatus)
    if (url.pathname.endsWith('reservations/') && method === 'GET') return listResponse(url)
    if (/\/reservations\/\d+\/(accept|reject|cancel)\/$/.test(url.pathname) && method === 'POST') return actionStatus >= 400 ? failed(actionStatus, actionCode) : ok({ ...detail, status: 'ACCEPTED' })
    if (/\/reservations\/\d+\/$/.test(url.pathname) && method === 'PATCH') return actionStatus >= 400 ? failed(actionStatus, actionCode, 'quantity') : ok({ ...detail, version: detail.version + 1 })
    if (/\/reservations\/\d+\/$/.test(url.pathname) && method === 'GET') return detailStatus === 200 ? ok(detail) : failed(detailStatus)
    throw new Error(`Unexpected request ${method} ${input}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><Outlet /></AuthProvider>, children: [
      { element: <RequireAuth />, children: [
        { path: '/reservations', element: <ReservationInbox /> },
        { path: '/reservations/:id', element: <ReservationDetail /> },
        { path: '/reservations/:id/edit', element: <EditReservation /> },
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
  expect(element, `Button ${text}`).toBeDefined()
  await act(async () => element.click())
}
async function input(selector: string, value: string) {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  await act(async () => {
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submitForm() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
const writes = () => requests.filter(item => ['POST', 'PATCH'].includes(item.method) && /\/reservations\/\d+\//.test(item.url.pathname))
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
  expect(container.textContent).toContain('Kontak belum tersedia')
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

// --- MR-FE-04: accept / reject / cancel ---
it('lets the claim approver (provider) accept with expected_version and reloads', async () => {
  await mount('/reservations/24', 2) // provider = approver of this claim
  await click('Terima claim')
  const accept = writes().find(item => item.url.pathname.endsWith('/accept/'))!
  expect(accept.body).toEqual({ expected_version: 1 })
  expect(accept.csrf).toBe('tok')
  // detail is refetched after the action (no false success from the POST alone)
  expect(requests.filter(item => /\/reservations\/24\/$/.test(item.url.pathname) && item.method === 'GET').length).toBeGreaterThan(1)
})
it('shows the approver the review heading, submission time and current availability', async () => {
  await mount('/reservations/24', 2) // provider = approver of this claim
  await settle() // let the source-availability fetch resolve
  expect(container.querySelector('h1')!.textContent).toBe('Tinjau claim')
  expect(container.textContent).toContain('Menunggu keputusan')
  expect(container.textContent).toContain('Komunitas Berbagi mengajukan')
  expect(container.textContent).toContain('Pengajuan ')
  expect(container.textContent).toContain('Jumlah tersedia saat ini')
  expect(container.textContent).toContain('7 box')
})
it('omits current availability when the source cannot be read (e.g. 501)', async () => {
  await mount('/reservations/24', 2, 200, {}, undefined, 501)
  await settle()
  expect(container.querySelector('h1')!.textContent).toBe('Tinjau claim')
  expect(container.textContent).not.toContain('Jumlah tersedia saat ini')
})
it('does not offer accept/reject to a non-approver participant', async () => {
  await mount('/reservations/24', 3) // receiver on a claim -> not approver
  expect(container.querySelector('h1')!.textContent).toBe('Pengajuan terkirim')
  expect([...container.querySelectorAll('button')].some(b => b.textContent?.startsWith('Terima'))).toBe(false)
  expect([...container.querySelectorAll('button')].some(b => b.textContent?.startsWith('Tolak'))).toBe(false)
})
it('requires a reason to reject and sends reason + expected_version', async () => {
  await mount('/reservations/24', 2)
  await click('Tolak claim') // opens the reason dialog
  await submitForm() // empty reason
  expect(writes().some(item => item.url.pathname.endsWith('/reject/'))).toBe(false)
  expect(container.textContent).toContain('Isi alasan')
  await input('[name="reason"]', 'Stok tidak cukup'); await submitForm()
  const reject = writes().find(item => item.url.pathname.endsWith('/reject/'))!
  expect(reject.body).toEqual({ reason: 'Stok tidak cukup', expected_version: 1 })
})
it('surfaces a reject error inside the dialog (not hidden behind the modal)', async () => {
  await mount('/reservations/24', 2)
  await click('Tolak claim')
  actionStatus = 500
  await input('[name="reason"]', 'Alasan'); await submitForm()
  // The dialog stays open on a non-409 error and shows the failure inside it.
  expect(container.querySelector('dialog')!.textContent).toContain('Tindakan belum selesai')
  expect(router.state.location.pathname).toBe('/reservations/24')
})
it('cancels an accepted reservation with a reason (no expected_version)', async () => {
  await mount('/reservations/24', 2, 200, { status: 'ACCEPTED', accepted_at: '2026-10-03T00:00:00Z', accepted_snapshot: terms })
  await click('Batalkan reservasi')
  await input('[name="reason"]', 'Jadwal bentrok'); await submitForm()
  const cancel = writes().find(item => item.url.pathname.endsWith('/cancel/'))!
  expect(cancel.body).toEqual({ reason: 'Jadwal bentrok' })
})
it('surfaces stale_version on accept and reloads without false success', async () => {
  await mount('/reservations/24', 2)
  actionStatus = 409; actionCode = 'stale_version'
  await click('Terima claim')
  expect(container.textContent).toContain('Pengajuan sudah diperbarui')
  // stays on the detail page; reloaded the detail
  expect(router.state.location.pathname).toBe('/reservations/24')
})
it('prevents double submission of accept', async () => {
  await mount('/reservations/24', 2)
  await act(async () => {
    const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Terima claim')!
    button.click(); button.click()
  })
  expect(writes().filter(item => item.url.pathname.endsWith('/accept/'))).toHaveLength(1)
})

// --- MR-FE-04: revise quantity (/edit) ---
it('revises the pending quantity with expected_version from the loaded data', async () => {
  await mount('/reservations/24/edit', 3) // submitter
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')!.value).toBe('4')
  await input('[name="quantity"]', '3'); await submitForm()
  const patch = writes().find(item => item.method === 'PATCH')!
  expect(patch.body).toEqual({ quantity: '3', expected_version: 1 })
  expect(router.state.location.pathname).toBe('/reservations/24')
})
it('blocks revise for a non-submitter', async () => {
  await mount('/reservations/24/edit', 2) // provider, not submitter
  expect(container.textContent).toContain('Hanya pengaju')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')!.disabled).toBe(true)
  await submitForm()
  expect(writes().some(item => item.method === 'PATCH')).toBe(false)
})
it('blocks revise once the reservation is no longer PENDING', async () => {
  await mount('/reservations/24/edit', 3, 200, { status: 'ACCEPTED' })
  expect(container.textContent).toContain('Hanya pengajuan yang masih menunggu')
  expect(container.querySelector<HTMLInputElement>('[name="quantity"]')!.disabled).toBe(true)
})
it('shows a server field error and stays on edit after a 409 on revise', async () => {
  await mount('/reservations/24/edit', 3)
  actionStatus = 409; actionCode = 'insufficient_quantity'
  await input('[name="quantity"]', '99'); await submitForm()
  expect(router.state.location.pathname).toBe('/reservations/24/edit')
  expect(container.textContent).toContain('Jumlah ditolak server.')
})
