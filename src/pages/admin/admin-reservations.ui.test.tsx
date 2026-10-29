import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAdmin from '../../auth/RequireAdmin.tsx'
import { setCsrfToken } from '../../services/api.ts'
import type { AdminReservation } from '../../services/reservations.ts'
import type { ReferenceData } from '../../services/reference.ts'
import AdminReservationList from './AdminReservationList.tsx'
import AdminReservationDetail from './AdminReservationDetail.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
const references: ReferenceData = {
  categories: [{ code: 'prepared_meal', label: 'Makanan siap konsumsi', resource_type: 'PACKAGED_FOOD_SURPLUS' }],
  units: [{ code: 'box', label: 'Box', allows_decimal: false, max_decimal_places: 0 }], resource_types: [{ code: 'PACKAGED_FOOD_SURPLUS', label: 'Makanan kemasan' }], suitabilities: [{ code: 'HUMAN_CONSUMPTION', label: 'Konsumsi manusia' }], modes: [{ code: 'DONATE', label: 'Donasi' }, { code: 'SELL', label: 'Jual' }],
}
const pickup = { label: 'Kampus UI Depok', area: 'Depok', latitude: -6.36, longitude: 106.82 }
const terms = {
  resource_type: 'PACKAGED_FOOD_SURPLUS', title: 'Nasi kotak surplus', category: 'prepared_meal', description: 'Nasi ayam',
  condition: 'Baru dikemas', suitability: ['HUMAN_CONSUMPTION'], location: pickup, storage_notes: null, allergen_notes: null, packaging_status: null,
  quantity: '4.000', unit: 'box', mode: 'DONATE' as const, unit_price: '0.00', total_price: '0.00', resource_deadline: '2099-11-01T17:30:45+07:00',
}
const base: AdminReservation = {
  id: 24, created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-02T00:00:00Z', version: 1,
  source_type: 'LISTING_CLAIM', listing_id: 101, request_id: null,
  provider: { id: 1, display_name: 'Dapur Bu Rani' }, receiver: { id: 2, display_name: 'Komunitas Berbagi' }, submitted_by_id: 2,
  status: 'PENDING', terms, accepted_snapshot: null, accepted_at: null, reason: null, cancellation_code: null, pickup: null, counterparty_contact: null,
  provider_contact: { user_id: 1, whatsapp_number: '+6281200000001', whatsapp_url: null },
  receiver_contact: { user_id: 2, whatsapp_number: '+6281200000002', whatsapp_url: null },
}
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let listResponse: (url: URL) => Response
let detail: AdminReservation
let detailStatus: number
let actionStatus: number
let actionCode: string
let requests: { url: URL; method: string; body: Record<string, unknown> | null; csrf: string | null }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error', field: string | null = null) => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field, code, message: field ? 'Jumlah ditolak server.' : 'Secret traceback' }] }, { status })
const pageOf = (results: AdminReservation[], next: string | null = null) => ok({ count: results.length, next, previous: null, results })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path: string, isAdmin = true, overrides: Partial<AdminReservation> = {}, detailResponseStatus = 200, listOverride?: (url: URL) => Response) {
  detail = { ...structuredClone(base), ...overrides }; detailStatus = detailResponseStatus; actionStatus = 200; actionCode = 'invalid'; requests = []
  listResponse = listOverride || (() => pageOf([base]))
  vi.stubGlobal('fetch', vi.fn(async (input: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(input, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    requests.push({ url, method, body, csrf: options.headers.get('X-CSRFToken') })
    if (url.pathname.endsWith('session/')) return ok({ authenticated: true, user: { id: 9, display_name: 'Admin', is_admin: isAdmin } })
    if (url.pathname.endsWith('csrf/')) return ok({ csrf_token: 'tok' })
    if (url.pathname.endsWith('reference-data/')) return ok(references)
    if (url.pathname.endsWith('admin/reservations/') && method === 'GET') return listResponse(url)
    if (/\/admin\/reservations\/\d+\/(accept|reject|cancel)\/$/.test(url.pathname) && method === 'POST') return actionStatus >= 400 ? failed(actionStatus, actionCode) : ok({ ...detail, status: 'ACCEPTED' })
    if (/\/admin\/reservations\/\d+\/$/.test(url.pathname) && method === 'PATCH') return actionStatus >= 400 ? failed(actionStatus, actionCode, 'quantity') : ok({ ...detail, version: detail.version + 1 })
    if (/\/admin\/reservations\/\d+\/$/.test(url.pathname) && method === 'GET') return detailStatus === 200 ? ok(detail) : failed(detailStatus)
    throw new Error(`Unexpected request ${method} ${input}`)
  }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><Outlet /></AuthProvider>, children: [
      { element: <RequireAdmin />, children: [
        { path: '/admin/reservations', element: <AdminReservationList /> },
        { path: '/admin/reservations/:id', element: <AdminReservationDetail /> },
      ] },
    ],
  }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
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
async function submitForm() { await act(async () => container.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
const writes = () => requests.filter(item => ['POST', 'PATCH'].includes(item.method) && /\/admin\/reservations\/\d+\//.test(item.url.pathname))
afterEach(async () => {
  await act(async () => root?.unmount()); router?.dispose(); container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); setCsrfToken(null)
})

// --- Access ---
it('blocks non-admins', async () => {
  await mount('/admin/reservations', false)
  expect(container.textContent).toContain('Akses ditolak')
  expect(requests.some(item => item.url.pathname.endsWith('admin/reservations/'))).toBe(false)
})

// --- List ---
it('lists all reservations with both parties and sends admin filters', async () => {
  await mount('/admin/reservations?status=PENDING&source_type=LISTING_CLAIM&provider_id=1&receiver_id=2')
  const request = requests.find(item => item.url.pathname.endsWith('admin/reservations/'))!
  expect(request.url.searchParams.get('status')).toBe('PENDING')
  expect(request.url.searchParams.get('source_type')).toBe('LISTING_CLAIM')
  expect(request.url.searchParams.get('provider_id')).toBe('1')
  expect(request.url.searchParams.get('receiver_id')).toBe('2')
  expect(container.textContent).toContain('RSV-024')
  expect(container.textContent).toContain('Dapur Bu Rani → Komunitas Berbagi')
})
it('shows an empty state', async () => {
  await mount('/admin/reservations', true, {}, 200, () => pageOf([]))
  expect(container.textContent).toContain('Belum ada reservasi')
})
it('shows a safe list error', async () => {
  await mount('/admin/reservations', true, {}, 200, () => failed(500))
  expect(container.textContent).toContain('Reservasi belum dapat dimuat')
  expect(container.textContent).not.toContain('Internal secret')
})

// --- Detail ---
it('shows both contacts, the admin-override notice and parties', async () => {
  await mount('/admin/reservations/24')
  expect(container.textContent).toContain('Moderasi admin')
  expect(container.textContent).toContain('Kontak provider')
  expect(container.textContent).toContain('Kontak receiver')
  expect(container.textContent).toContain('+6281200000001')
  expect(container.textContent).toContain('+6281200000002')
})
it('accepts with a required reason and expected_version, then reloads', async () => {
  await mount('/admin/reservations/24')
  await click('Terima claim')
  await submitForm() // empty reason blocked
  expect(writes().some(item => item.url.pathname.endsWith('/accept/'))).toBe(false)
  expect(container.querySelector('dialog')!.textContent).toContain('Isi alasan')
  await input('[name="reason"]', 'Disetujui moderator'); await submitForm()
  const accept = writes().find(item => item.url.pathname.endsWith('/accept/'))!
  expect(accept.body).toEqual({ reason: 'Disetujui moderator', expected_version: 1 })
  expect(accept.csrf).toBe('tok')
  expect(requests.filter(item => /\/admin\/reservations\/24\/$/.test(item.url.pathname) && item.method === 'GET').length).toBeGreaterThan(1)
})
it('rejects with a required reason and expected_version', async () => {
  await mount('/admin/reservations/24')
  await click('Tolak claim')
  await input('[name="reason"]', 'Tidak sesuai'); await submitForm()
  expect(writes().find(item => item.url.pathname.endsWith('/reject/'))!.body).toEqual({ reason: 'Tidak sesuai', expected_version: 1 })
})
it('cancels an accepted reservation with a reason (no expected_version)', async () => {
  await mount('/admin/reservations/24', true, { status: 'ACCEPTED', accepted_at: '2026-10-03T00:00:00Z', accepted_snapshot: terms })
  await click('Batalkan reservasi')
  await input('[name="reason"]', 'Koreksi moderator'); await submitForm()
  expect(writes().find(item => item.url.pathname.endsWith('/cancel/'))!.body).toEqual({ reason: 'Koreksi moderator' })
})
it('revises the pending quantity with reason + expected_version', async () => {
  await mount('/admin/reservations/24')
  await click('Ubah jumlah')
  await input('[name="quantity"]', '3')
  await input('[name="reason"]', 'Koreksi jumlah')
  await click('Simpan jumlah')
  const patch = writes().find(item => item.method === 'PATCH')!
  expect(patch.body).toEqual({ quantity: '3', expected_version: 1, reason: 'Koreksi jumlah' })
})
it('surfaces stale_version on accept and reloads without false success', async () => {
  await mount('/admin/reservations/24')
  actionStatus = 409; actionCode = 'stale_version'
  await click('Terima claim'); await input('[name="reason"]', 'x'); await submitForm()
  expect(container.textContent).toContain('Pengajuan sudah diperbarui')
  expect(router.state.location.pathname).toBe('/admin/reservations/24')
})
it('prevents double submission of accept', async () => {
  await mount('/admin/reservations/24')
  await click('Terima claim'); await input('[name="reason"]', 'ok')
  await act(async () => {
    const form = container.querySelector('dialog form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(writes().filter(item => item.url.pathname.endsWith('/accept/'))).toHaveLength(1)
})
it('handles an offer reservation with the right heading wording', async () => {
  await mount('/admin/reservations/24', true, { source_type: 'REQUEST_OFFER', listing_id: null, request_id: 55 })
  expect(container.querySelector('h1')!.textContent).toContain('penawaran')
})
it('shows a safe detail error on 404', async () => {
  await mount('/admin/reservations/24', true, {}, 404)
  expect(container.textContent).toContain('Reservation belum dapat dibuka')
  expect(container.textContent).not.toContain('Internal secret')
})
