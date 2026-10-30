import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import RequireAdmin from '../../auth/RequireAdmin.tsx'
import { setCsrfToken } from '../../services/api.ts'
import AdminPickups from './AdminPickups.tsx'
import AdminPickupDetail from './AdminPickupDetail.tsx'
import { adminPickupTimeline } from './pickupsModel.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root
let container: HTMLDivElement
let writes: { url: URL; method: string; body: Record<string, unknown>; csrf: string | null }[]
let requests: URL[]
let user: { id: number; is_admin: boolean }
let pickup: Record<string, unknown>
let reservation: Record<string, unknown>
let actionFailure: { status: number; code: string } | null
let networkFailure = false

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value() { this.open = true },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value() { this.open = false },
})

const location = { label: 'Balai Warga Beji', area: 'Depok', latitude: -6.37, longitude: 106.83 }
const futureDeadline = () => new Date(Date.now() + 24 * 60 * 60_000).toISOString()
const pastPickup = () => new Date(Date.now() - 60_000).toISOString()

function ok(data: unknown) {
  return Response.json({ success: true, data })
}

function failure(status: number, code: string) {
  return Response.json({ success: false, message: 'Request failed', errors: [{ field: null, code, message: code }] }, { status })
}

async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
}

async function mount(path: string, admin = true, options: { pickupStatus?: string; scheduledAt?: string; deadline?: string; reservationStatus?: string; existingReservationPickup?: boolean } = {}) {
  user = { id: 99, is_admin: admin }
  pickup = {
    id: 17,
    reservation_id: 31,
    created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    version: 2,
    scheduled_at: options.scheduledAt || pastPickup(),
    location: structuredClone(location),
    instructions: 'Temui petugas di pintu utama.',
    status: options.pickupStatus || 'SCHEDULED',
    completed_at: options.pickupStatus === 'COMPLETED' ? new Date().toISOString() : null,
    no_show_at: options.pickupStatus === 'NO_SHOW' ? new Date().toISOString() : null,
    cancelled_at: options.pickupStatus === 'CANCELLED' ? new Date().toISOString() : null,
  }
  reservation = {
    id: 31,
    status: options.reservationStatus || (options.pickupStatus === 'NO_SHOW' || options.pickupStatus === 'CANCELLED' ? 'CANCELLED' : 'ACCEPTED'),
    created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    accepted_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    provider: { id: 7, display_name: 'Provider Sari', whatsapp_number: '+6281234567001' },
    receiver: { id: 8, display_name: 'Receiver Pangan', whatsapp_number: '+6281234567002' },
    accepted_snapshot: {
      title: 'Nasi kotak', quantity: '4.000', unit: 'box', mode: 'DONATE',
      resource_type: 'PACKAGED_FOOD_SURPLUS', resource_deadline: options.deadline || futureDeadline(),
      location: structuredClone(location), condition: 'Makanan siap dibagikan.',
    },
    pickup: options.existingReservationPickup ? { id: 17, status: 'SCHEDULED' } : null,
    reason: null,
    history: [],
  }
  writes = []
  requests = []
  actionFailure = null
  networkFailure = false

  vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit & { headers: Headers }) => {
    const url = new URL(input, 'http://localhost')
    const method = init.method || 'GET'
    const body = init.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
    requests.push(url)
    if (method !== 'GET') writes.push({ url, method, body, csrf: init.headers.get('X-CSRFToken') })
    if (url.pathname.endsWith('/auth/session/')) return ok({ authenticated: true, user: { ...user, is_active: true } })
    if (url.pathname.endsWith('/auth/csrf/')) return ok({ csrf_token: 'admin-pickup-csrf' })
    if (url.pathname.endsWith('/admin/pickups/') && method === 'GET') {
      return ok({ count: 1, next: null, previous: null, results: [structuredClone(pickup)] })
    }
    if (url.pathname.endsWith('/admin/pickups/17/') && method === 'GET') return ok(structuredClone(pickup))
    if (url.pathname.endsWith('/admin/reservations/31/') && method === 'GET') return ok(structuredClone(reservation))
    if (url.pathname.endsWith('/admin/reservations/31/pickup/') && method === 'POST') {
      if (networkFailure) throw new Error('Network unavailable')
      if (actionFailure) return failure(actionFailure.status, actionFailure.code)
      pickup = { ...pickup, reservation_id: 31, scheduled_at: body.scheduled_at, instructions: body.instructions, status: 'SCHEDULED' }
      reservation = { ...reservation, pickup: { id: 17, status: 'SCHEDULED', scheduled_at: body.scheduled_at } }
      return new Response(JSON.stringify({ success: true, data: structuredClone(pickup) }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    if (url.pathname.endsWith('/admin/pickups/17/') && method === 'PATCH') {
      if (networkFailure) throw new Error('Network unavailable')
      if (actionFailure) return failure(actionFailure.status, actionFailure.code)
      pickup = { ...pickup, instructions: body.instructions }
      return ok(structuredClone(pickup))
    }
    if ((url.pathname.endsWith('/admin/pickups/17/complete/') || url.pathname.endsWith('/admin/pickups/17/no-show/')) && method === 'POST') {
      if (networkFailure) throw new Error('Network unavailable')
      if (actionFailure) return failure(actionFailure.status, actionFailure.code)
      const noShow = url.pathname.endsWith('/no-show/')
      pickup = { ...pickup, status: noShow ? 'NO_SHOW' : 'COMPLETED', ...(noShow ? { no_show_at: new Date().toISOString() } : { completed_at: new Date().toISOString() }), reason: body.reason }
      if (noShow) reservation = { ...reservation, status: 'CANCELLED', reason: body.reason }
      return ok(structuredClone(pickup))
    }
    throw new Error(`Unexpected ${method} ${url.pathname}`)
  }))

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const router = createMemoryRouter([
    {
      element: <AuthProvider><Outlet /></AuthProvider>,
      children: [{
        element: <RequireAdmin />,
        children: [
          { path: '/admin/pickups', element: <AdminPickups /> },
          { path: '/admin/pickups/:id', element: <AdminPickupDetail /> },
        ],
      }],
    },
  ], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />))
  await settle()
}

async function clickButton(label: string) {
  const button = [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === label)
  if (!button) throw new Error(`Button not found: ${label}`)
  await act(async () => button.click())
  await settle()
}

async function setTextarea(value: string, index = 0) {
  const element = [...container.querySelectorAll<HTMLTextAreaElement>('textarea')][index]
  if (!element) throw new Error(`Textarea ${index} not found`)
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function submitForm(form: HTMLFormElement) {
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await settle()
}

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setCsrfToken(null)
})

it('shows admin pickup filters, reservation participants and history detail links', async () => {
  await mount('/admin/pickups')
  expect(container.textContent).toContain('Pickup dan histori')
  expect(container.textContent).toContain('PU-017')
  expect(container.textContent).toContain('RSV-031')
  expect(container.querySelector('a[href="/admin/pickups/17"]')).not.toBeNull()
  expect(container.querySelector('select')).not.toBeNull()
})

it('blocks non-admin users from pickup moderation', async () => {
  await mount('/admin/pickups', false)
  expect(container.textContent).toContain('Halaman ini memerlukan akses admin.')
  expect(requests.some(url => url.pathname.endsWith('/admin/pickups/'))).toBe(false)
})

it('filters pickups by status and reservation and validates reservation ids', async () => {
  await mount('/admin/pickups')
  const status = container.querySelector('select')!
  await act(async () => {
    status.value = 'NO_SHOW'
    status.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const reservationInput = [...container.querySelectorAll<HTMLInputElement>('input')].find(input => input.placeholder === 'Semua reservation')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(reservationInput, '31')
    reservationInput.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(container.querySelectorAll('form')[1])
  const filtered = requests.find(url => url.pathname.endsWith('/admin/pickups/') && url.searchParams.get('status') === 'NO_SHOW')
  expect(filtered?.searchParams.get('reservation_id')).toBe('31')
  expect(filtered?.searchParams.get('page')).toBe('1')

  const idInput = [...container.querySelectorAll<HTMLInputElement>('input')].find(input => input.placeholder === 'Semua reservation')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(idInput, '0')
    idInput.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(container.querySelectorAll('form')[1])
  expect(container.textContent).toContain('ID reservation harus berupa bilangan bulat positif.')
})

it('schedules only an accepted reservation with a required reason and refreshes the list', async () => {
  await mount('/admin/pickups')
  const idInput = [...container.querySelectorAll<HTMLInputElement>('input')].find(input => input.placeholder === 'Contoh: 123')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(idInput, '31')
    idInput.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await clickButton('Periksa reservation')
  expect(container.textContent).toContain('Provider Sari')
  expect(container.textContent).toContain('Receiver Pangan')
  const scheduleForm = container.querySelectorAll('form')[1]
  expect(scheduleForm.noValidate).toBe(true)
  const scheduledAt = container.querySelector<HTMLInputElement>('input[type="datetime-local"]')!
  const validScheduledAt = scheduledAt.value
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(scheduledAt, '')
    scheduledAt.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(scheduleForm)
  expect(container.textContent).toContain('Masukkan tanggal dan waktu pickup yang valid.')
  expect(container.textContent).toContain('Alasan wajib diisi.')
  expect(writes.some(write => write.url.pathname.endsWith('/pickup/'))).toBe(false)

  const reasonArea = container.querySelectorAll<HTMLTextAreaElement>('textarea')[1]
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(reasonArea, 'Penjadwalan handoff oleh admin.')
    reasonArea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(scheduledAt, validScheduledAt)
    scheduledAt.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(scheduleForm)
  expect(writes.at(-1)).toMatchObject({
    url: expect.objectContaining({ pathname: '/api/v1/admin/reservations/31/pickup/' }),
    method: 'POST',
    body: { reason: 'Penjadwalan handoff oleh admin.', instructions: null },
    csrf: 'admin-pickup-csrf',
  })
  expect(container.textContent).toContain('Pickup berhasil dijadwalkan')
  expect(requests.filter(url => url.pathname.endsWith('/admin/pickups/'))).toHaveLength(2)
})

it('does not offer actions for terminal pickups', async () => {
  await mount('/admin/pickups/17', true, { pickupStatus: 'COMPLETED' })
  expect(container.textContent).toContain('Pickup sudah terminal')
  expect(container.textContent).not.toContain('Koreksi instruksi')
  expect(container.textContent).not.toContain('Catat selesai')
  expect(container.textContent).not.toContain('Tandai tidak hadir')
})

it('shows reservation participants and full pickup history on detail', async () => {
  await mount('/admin/pickups/17')
  expect(container.textContent).toContain('Provider Sari')
  expect(container.textContent).toContain('Receiver Pangan')
  expect(container.textContent).toContain('Kontak provider')
  expect(container.textContent).toContain('Riwayat pickup')
  expect(container.textContent).toContain('Pickup dijadwalkan')
})

it('keeps pickup history in reservation-to-terminal order when backend timestamps collide or arrive out of order', () => {
  const timeline = adminPickupTimeline({
    id: 17,
    reservation_id: 31,
    scheduled_at: '2026-10-29T22:30:00Z',
    location,
    instructions: null,
    status: 'CANCELLED',
    completed_at: null,
    no_show_at: null,
    cancelled_at: '2026-10-29T22:20:00Z',
  }, {
    id: 31,
    status: 'CANCELLED',
    created_at: '2026-10-29T22:40:00Z',
    accepted_at: '2026-10-29T22:10:00Z',
  })

  expect(timeline.map(item => item.label)).toEqual([
    'Reservation diajukan',
    'Reservation diterima',
    'Pickup dijadwalkan',
    'Pickup dibatalkan',
  ])
})

it('corrects instructions using the admin PATCH endpoint and requires an audit reason', async () => {
  await mount('/admin/pickups/17')
  await clickButton('Koreksi instruksi')
  await setTextarea('Instruksi koreksi moderator.', 0)
  await submitForm(container.querySelector('dialog form')!)
  expect(container.textContent).toContain('Alasan wajib diisi.')
  const reasonArea = container.querySelectorAll<HTMLTextAreaElement>('dialog textarea')[1]
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(reasonArea, 'Koreksi atas permintaan provider.')
    reasonArea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(container.querySelector('dialog form')!)
  expect(writes.at(-1)).toMatchObject({
    url: expect.objectContaining({ pathname: '/api/v1/admin/pickups/17/' }),
    method: 'PATCH',
    body: { instructions: 'Instruksi koreksi moderator.', reason: 'Koreksi atas permintaan provider.' },
  })
  expect(container.textContent).toContain('Instruksi pickup berhasil dikoreksi')
})

it.each([
  ['complete', 'Catat selesai', 'complete', 'Penerimaan handoff diverifikasi admin.'],
  ['no-show', 'Tandai tidak hadir', 'no-show', 'Receiver tidak hadir saat jadwal pickup.'],
] as const)('records admin %s with a reason and refreshes terminal state', async (_action, buttonLabel, endpoint, reasonValue) => {
  await mount('/admin/pickups/17')
  await clickButton(buttonLabel)
  await submitForm(container.querySelector('dialog form')!)
  expect(container.textContent).toContain('Alasan wajib diisi.')
  const reasonArea = container.querySelector('dialog textarea')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(reasonArea, reasonValue)
    reasonArea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(container.querySelector('dialog form')!)
  expect(writes.at(-1)).toMatchObject({
    url: expect.objectContaining({ pathname: `/api/v1/admin/pickups/17/${endpoint}/` }),
    method: 'POST',
    body: { reason: reasonValue },
  })
  expect(requests.filter(url => url.pathname.endsWith('/admin/pickups/17/')).length).toBeGreaterThanOrEqual(2)
  expect(container.textContent).toContain(endpoint === 'complete' ? 'Pickup berhasil dicatat selesai' : 'reservation dibatalkan')
  expect(container.querySelector('button')?.textContent).not.toBe(buttonLabel)
})

it.each([
  ['complete', 'Catat selesai'],
  ['no-show', 'Tandai tidak hadir'],
] as const)('shows backend transition errors without false %s success', async (_action, buttonLabel) => {
  await mount('/admin/pickups/17')
  actionFailure = { status: 409, code: 'invalid_transition' }
  await clickButton(buttonLabel)
  const reasonArea = container.querySelector('dialog textarea')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(reasonArea, 'Percobaan audit.')
    reasonArea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(container.querySelector('dialog form')!)
  expect(container.textContent).toContain('Status reservation atau pickup sudah berubah.')
  expect(container.textContent).toContain('Terjadwal')
  expect(container.textContent).not.toContain('Perubahan berhasil')
})

it('hides no-show until pickup time passes and hides actions at the resource deadline', async () => {
  await mount('/admin/pickups/17', true, { scheduledAt: new Date(Date.now() + 60_000).toISOString() })
  expect(container.textContent).toContain('No-show tersedia setelah waktu pickup terlewati.')
  expect(container.querySelectorAll('button').length).toBeGreaterThan(0)
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Tandai tidak hadir')).toBe(false)

  await act(async () => root.unmount())
  await mount('/admin/pickups/17', true, {
    scheduledAt: pastPickup(),
    deadline: new Date(Date.now() - 1_000).toISOString(),
  })
  expect(container.textContent).toContain('Deadline resource terlewati')
  expect([...container.querySelectorAll('button')].some(button => ['Koreksi instruksi', 'Catat selesai', 'Tandai tidak hadir'].includes(button.textContent || ''))).toBe(false)
})

it('keeps pickup scheduled and reports a network failure without false success', async () => {
  await mount('/admin/pickups/17')
  networkFailure = true
  await clickButton('Catat selesai')
  const reasonArea = container.querySelector('dialog textarea')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(reasonArea, 'Alasan moderator.')
    reasonArea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submitForm(container.querySelector('dialog form')!)
  expect(container.textContent).toContain('Permintaan belum dapat diproses. Periksa koneksi dan coba lagi.')
  expect(container.textContent).toContain('Terjadwal')
  expect(container.textContent).not.toContain('Perubahan berhasil')
})
