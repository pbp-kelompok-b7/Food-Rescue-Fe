import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import { setCsrfToken } from '../../services/api.ts'
import EditPickupInstructions from './EditPickupInstructions.tsx'
import PickupDetail from './PickupDetail.tsx'
import PickupsList from './PickupsList.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root
let container: HTMLDivElement
let pickup: Record<string, unknown>
let reservation: Record<string, unknown>
let listCalls: URL[]
let detailRefreshCalls: URL[]
let writes: { url: URL; method: string; body: unknown; csrf: string | null }[]
let listPage: Record<string, unknown>
let detailStatus: number | null
let updateFailure: { status: number; code: string; field?: string } | null
let actionFailure: { status: number; code: string; field?: string } | null
let actionNetworkFailure = false

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value() { this.open = true },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value() { this.open = false },
})

const pickupLocation = {
  label: 'Balai Warga Beji',
  area: 'Depok',
  latitude: -6.37,
  longitude: 106.83,
}

function ok(data: unknown) {
  return Response.json({ success: true, data })
}

function failure(status: number, code = 'not_found', field: string | null = null) {
  return Response.json({
    success: false,
    message: 'Request failed',
    errors: [{ field, code, message: code }],
  }, { status })
}

async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 15))
  })
}

async function mount(
  entry: string,
  userId = 7,
  options: {
    status?: string
    instructions?: string | null
    detailStatus?: number
    list?: Record<string, unknown>
    scheduledAt?: string
    deadline?: string
    sourceType?: string
  } = {},
) {
  const status = options.status || 'SCHEDULED'
  pickup = {
    id: 12,
    reservation_id: 31,
    scheduled_at: options.scheduledAt || '2099-09-10T08:30:00Z',
    location: structuredClone(pickupLocation),
    instructions: options.instructions === undefined ? 'Temui petugas di lobi.' : options.instructions,
    status,
    completed_at: null,
    no_show_at: null,
    cancelled_at: status === 'CANCELLED' ? '2099-09-09T00:00:00Z' : null,
  }
  reservation = {
    id: 31,
    source_type: options.sourceType || 'LISTING_CLAIM',
    listing_id: (options.sourceType || 'LISTING_CLAIM') === 'LISTING_CLAIM' ? 51 : null,
    request_id: options.sourceType === 'REQUEST_OFFER' ? 61 : null,
    status: status === 'CANCELLED' ? 'CANCELLED' : 'ACCEPTED',
    provider: { id: 7, display_name: 'Dapur Provider' },
    receiver: { id: 8, display_name: 'Komunitas Receiver' },
    accepted_snapshot: {
      title: 'Nasi kotak surplus',
      quantity: '4.000',
      unit: 'box',
      resource_deadline: options.deadline || '2099-09-10T12:00:00Z',
      location: structuredClone(pickupLocation),
    },
    pickup: { id: 12 },
    counterparty_contact: status === 'CANCELLED'
      ? null
      : { user_id: userId === 7 ? 8 : 7, whatsapp_number: '+6281234567890', whatsapp_url: null },
  }
  listCalls = []
  detailRefreshCalls = []
  writes = []
  const defaultListPage = {
    count: 1,
    next: null,
    previous: null,
    results: [structuredClone(pickup)],
  }
  listPage = options.list
    ? { ...defaultListPage, ...options.list }
    : defaultListPage
  detailStatus = options.detailStatus ?? null
  updateFailure = null
  actionFailure = null
  actionNetworkFailure = false

  vi.stubGlobal('fetch', vi.fn(async (input: string, options: RequestInit & { headers: Headers }) => {
    const url = new URL(input, 'http://localhost')
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    if (method !== 'GET') {
      writes.push({ url, method, body, csrf: options.headers.get('X-CSRFToken') })
    }
    if (url.pathname.endsWith('/auth/session/')) {
      return ok({ authenticated: true, user: { id: userId, is_active: true } })
    }
    if (url.pathname.endsWith('/auth/csrf/')) return ok({ csrf_token: 'pickup-test-csrf' })
    if (url.pathname.endsWith('/pickups/') && method === 'GET') {
      listCalls.push(url)
      return ok(structuredClone(listPage))
    }
    if (url.pathname.endsWith('/pickups/12/') && method === 'GET') {
      detailRefreshCalls.push(url)
      return detailStatus ? failure(detailStatus) : ok(structuredClone(pickup))
    }
    if (url.pathname.endsWith('/reservations/31/') && method === 'GET') {
      detailRefreshCalls.push(url)
      return ok(structuredClone(reservation))
    }
    if ((url.pathname.endsWith('/listings/51/') || url.pathname.endsWith('/requests/61/')) && method === 'GET') {
      detailRefreshCalls.push(url)
      return ok({ id: url.pathname.endsWith('/listings/51/') ? 51 : 61 })
    }
    if (url.pathname.endsWith('/pickups/12/') && method === 'PATCH') {
      if (updateFailure) return failure(updateFailure.status, updateFailure.code, updateFailure.field || null)
      pickup = { ...pickup, ...body }
      return ok(structuredClone(pickup))
    }
    if (url.pathname.endsWith('/pickups/12/complete/') && method === 'POST') {
      if (actionNetworkFailure) throw new Error('Network unavailable')
      if (actionFailure) return failure(actionFailure.status, actionFailure.code, actionFailure.field || null)
      pickup = { ...pickup, status: 'COMPLETED' }
      return ok(structuredClone(pickup))
    }
    if (url.pathname.endsWith('/pickups/12/no-show/') && method === 'POST') {
      if (actionNetworkFailure) throw new Error('Network unavailable')
      if (actionFailure) return failure(actionFailure.status, actionFailure.code, actionFailure.field || null)
      pickup = { ...pickup, status: 'NO_SHOW' }
      reservation = { ...reservation, status: 'CANCELLED' }
      return ok(structuredClone(pickup))
    }
    throw new Error(`Unexpected request ${method} ${url.pathname}`)
  }))

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const router = createMemoryRouter([
    {
      element: <AuthProvider><Outlet /></AuthProvider>,
      children: [
        { path: '/pickups', element: <PickupsList /> },
        { path: '/pickups/:id', element: <PickupDetail /> },
        { path: '/pickups/:id/edit', element: <EditPickupInstructions /> },
        { path: '/reservations/:id', element: <p>Detail reservation</p> },
      ],
    },
  ], { initialEntries: [entry] })
  await act(async () => root.render(<RouterProvider router={router} />))
  await settle()
}

async function setTextarea(value: string, name = 'instructions') {
  const element = container.querySelector<HTMLTextAreaElement>(`[name="${name}"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clickButton(label: string) {
  const button = [...container.querySelectorAll('button')]
    .find(item => item.textContent?.trim() === label)
  if (!button) throw new Error(`Button not found: ${label}`)
  await act(async () => button.click())
  await settle()
}

function visibleButtons() {
  return [...container.querySelectorAll('button')].filter(button => !button.closest('dialog'))
}

function dialogWithTitle(title: string) {
  return [...container.querySelectorAll('dialog')]
    .find(dialog => dialog.querySelector('h2')?.textContent === title)
}

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setCsrfToken(null)
})

it('lists participant pickup history with status/role filters and pagination', async () => {
  const paginated = {
    count: 21,
    next: 'http://localhost/api/v1/pickups/?page=2',
    previous: null,
  }
  await mount('/pickups?status=CANCELLED&role=provider', 7, {
    status: 'CANCELLED',
    list: paginated,
  })
  expect(listCalls[0].searchParams.get('status')).toBe('CANCELLED')
  expect(listCalls[0].searchParams.get('role')).toBe('provider')
  const terminalCard = [...container.querySelectorAll('article')]
    .find(card => card.textContent?.includes('PICKUP-012'))
  expect(terminalCard?.textContent).toContain('PICKUP-012')
  expect(terminalCard?.textContent).toContain('Dibatalkan')
  expect(container.querySelector('a[href="/pickups/12"]')).not.toBeNull()

  const next = [...container.querySelectorAll('button')].find(button => button.textContent === 'Berikutnya')!
  await act(async () => next.click())
  await settle()
  expect(listCalls.at(-1)?.searchParams.get('page')).toBe('2')
})

it('keeps completed, no-show, and cancelled pickups visible in history', async () => {
  const terminalStatuses = [
    { id: 20, status: 'COMPLETED', label: 'Selesai' },
    { id: 21, status: 'NO_SHOW', label: 'Tidak hadir' },
    { id: 22, status: 'CANCELLED', label: 'Dibatalkan' },
  ]
  const results = terminalStatuses.map(({ id, status }) => ({
    id,
    reservation_id: id + 20,
    scheduled_at: '2099-09-10T08:30:00Z',
    location: structuredClone(pickupLocation),
    instructions: null,
    status,
    completed_at: status === 'COMPLETED' ? '2099-09-10T09:00:00Z' : null,
    no_show_at: status === 'NO_SHOW' ? '2099-09-10T09:00:00Z' : null,
    cancelled_at: status === 'CANCELLED' ? '2099-09-10T09:00:00Z' : null,
  }))
  await mount('/pickups', 7, {
    list: { count: results.length, next: null, previous: null, results },
  })

  const cards = [...container.querySelectorAll('article')]
  for (const { id, label } of terminalStatuses) {
    const card = cards.find(item => item.textContent?.includes(`PICKUP-${String(id).padStart(3, '0')}`))
    expect(card?.textContent).toContain(label)
  }
})

it('shows an empty state and handles out-of-range list pages', async () => {
  await mount('/pickups', 7, { list: { count: 0, next: null, previous: null, results: [] } })
  expect(container.textContent).toContain('Belum ada pickup')

  await act(async () => root.unmount())
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname.endsWith('/auth/session/')) return ok({ authenticated: true, user: { id: 7 } })
    if (url.pathname.endsWith('/pickups/')) return failure(404, 'page_not_found')
    throw new Error(`Unexpected request ${url.pathname}`)
  }))
  const router = createMemoryRouter([
    { path: '/pickups', element: <AuthProvider><PickupsList /></AuthProvider> },
  ], { initialEntries: ['/pickups?page=99'] })
  root = createRoot(container)
  await act(async () => root.render(<RouterProvider router={router} />))
  await settle()
  expect(container.textContent).toContain('Halaman tidak ditemukan')
  expect(container.textContent).toContain('Halaman pertama')
})

it('supports a provider deep link, null instructions, terminal read-only state, and reservation link', async () => {
  await mount('/pickups/12/edit', 7, { instructions: null })
  expect(container.textContent).toContain('Edit instruksi pickup')
  expect(container.querySelector('textarea')?.value).toBe('')
  expect(container.querySelector('a[href="/pickups/12"]')).not.toBeNull()

  await act(async () => root.unmount())
  await mount('/pickups/12', 8, { status: 'COMPLETED', instructions: null })
  expect(container.textContent).toContain('Tidak ada instruksi tambahan.')
  expect(container.querySelector('a[href="/pickups/12/edit"]')).toBeNull()
  expect(container.querySelector('a[href="/reservations/31"]')).not.toBeNull()
})

it('keeps receiver detail read-only and handles deep-link 404 for nonparticipants', async () => {
  await mount('/pickups/12', 8)
  expect(container.querySelector('a[href="/pickups/12/edit"]')).toBeNull()

  await act(async () => root.unmount())
  await mount('/pickups/12', 99, { detailStatus: 404 })
  expect(container.textContent).toContain('Pickup tidak ditemukan atau tidak dapat diakses.')
})

it.each(['LISTING_CLAIM', 'REQUEST_OFFER'])('lets only the receiver confirm all received quantity for %s', async sourceType => {
  await mount('/pickups/12', 8, { sourceType })
  expect(container.textContent).toContain('Konfirmasi penerimaan')
  expect(container.querySelector('button')?.textContent).toContain('Konfirmasi penerimaan')
  await clickButton('Konfirmasi penerimaan')
  expect(container.querySelector('dialog')?.open).toBe(true)
  expect(container.querySelector('dialog')?.textContent).toContain('seluruh 4 box diterima')
  expect(container.querySelector('dialog')?.textContent).toContain('bukan verifikasi pembayaran')
  await clickButton('Ya, saya sudah menerima')

  expect(writes.at(-1)).toMatchObject({
    url: expect.objectContaining({ pathname: '/api/v1/pickups/12/complete/' }),
    method: 'POST',
    body: {},
    csrf: 'pickup-test-csrf',
  })
  expect(container.textContent).toContain('Pickup selesai')
  expect(container.textContent).toContain('Ini bukan verifikasi pembayaran.')
  expect(container.querySelector('button')?.textContent).not.toContain('Konfirmasi penerimaan')
  expect(detailRefreshCalls.map(url => url.pathname)).toContain('/api/v1/pickups/12/')
  expect(detailRefreshCalls.map(url => url.pathname)).toContain('/api/v1/reservations/31/')
  expect(detailRefreshCalls.map(url => url.pathname)).toContain(
    sourceType === 'LISTING_CLAIM' ? '/api/v1/listings/51/' : '/api/v1/requests/61/',
  )
})

it.each(['LISTING_CLAIM', 'REQUEST_OFFER'])('lets only the provider report a no-show after schedule for %s', async sourceType => {
  const scheduledAt = new Date(Date.now() - 60_000).toISOString()
  const deadline = new Date(Date.now() + 24 * 60 * 60_000).toISOString()
  await mount('/pickups/12', 7, { sourceType, scheduledAt, deadline })
  await clickButton('Tandai tidak hadir')
  const noShowDialog = dialogWithTitle('Tandai pickup tidak hadir?')
  expect(noShowDialog?.open).toBe(true)
  expect(noShowDialog?.textContent).toContain('reservation dibatalkan')

  await clickButton('Ya, tandai tidak hadir')
  expect(noShowDialog?.textContent).toContain('Alasan wajib diisi.')
  expect(writes.some(write => write.url.pathname.endsWith('/no-show/'))).toBe(false)

  await setTextarea('Receiver tidak datang setelah dihubungi.', 'reason')
  await clickButton('Ya, tandai tidak hadir')
  expect(writes.at(-1)).toMatchObject({
    url: expect.objectContaining({ pathname: '/api/v1/pickups/12/no-show/' }),
    method: 'POST',
    body: { reason: 'Receiver tidak datang setelah dihubungi.' },
    csrf: 'pickup-test-csrf',
  })
  expect(container.textContent).toContain('Pickup tidak terlaksana')
  expect(container.textContent).toContain('Reservasi dibatalkan')
  expect(container.querySelector('button')?.textContent).not.toContain('Tandai tidak hadir')
  expect(detailRefreshCalls.map(url => url.pathname)).toContain('/api/v1/pickups/12/')
  expect(detailRefreshCalls.map(url => url.pathname)).toContain('/api/v1/reservations/31/')
  expect(detailRefreshCalls.map(url => url.pathname)).toContain(
    sourceType === 'LISTING_CLAIM' ? '/api/v1/listings/51/' : '/api/v1/requests/61/',
  )
})

it.each(['complete', 'no-show'] as const)('submits %s at most once on a double click', async action => {
  await mount('/pickups/12', action === 'complete' ? 8 : 7, {
    scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  })
  const openActionLabel = action === 'complete' ? 'Konfirmasi penerimaan' : 'Tandai tidak hadir'
  const confirmLabel = action === 'complete' ? 'Ya, saya sudah menerima' : 'Ya, tandai tidak hadir'
  await clickButton(openActionLabel)
  if (action === 'no-show') await setTextarea('Receiver tidak hadir.', 'reason')

  const confirmButton = [...container.querySelectorAll('button')]
    .find(button => button.textContent?.trim() === confirmLabel)!
  await act(async () => {
    confirmButton.click()
    confirmButton.click()
  })
  await settle()

  const endpoint = action === 'complete' ? '/complete/' : '/no-show/'
  expect(writes.filter(write => write.url.pathname.endsWith(endpoint))).toHaveLength(1)
})

it('hides completion and no-show actions for the wrong role or outside the eligible time window', async () => {
  await mount('/pickups/12', 7)
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Konfirmasi penerimaan')
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Tandai tidak hadir')

  await act(async () => root.unmount())
  await mount('/pickups/12', 7, {
    scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  })
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Tandai tidak hadir')

  await act(async () => root.unmount())
  await mount('/pickups/12', 7, {
    scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    deadline: new Date(Date.now() - 1_000).toISOString(),
  })
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Tandai tidak hadir')

  await act(async () => root.unmount())
  await mount('/pickups/12', 8, {
    deadline: new Date(Date.now() - 1_000).toISOString(),
  })
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Konfirmasi penerimaan')
})

it('shows a no-show time conflict without marking the pickup complete or cancelled', async () => {
  await mount('/pickups/12', 7, {
    scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  })
  actionFailure = { status: 409, code: 'pickup_time_not_passed' }
  await clickButton('Tandai tidak hadir')
  await setTextarea('Receiver tidak hadir.', 'reason')
  await clickButton('Ya, tandai tidak hadir')

  expect(dialogWithTitle('Tandai pickup tidak hadir?')?.textContent)
    .toContain('No-show hanya dapat dicatat setelah waktu pickup terlewati.')
  expect(container.textContent).toContain('Pickup terjadwal')
})

it.each([
  ['complete', 8, 'deadline_passed', 'Batas resource sudah lewat. Penerimaan tidak dapat dikonfirmasi.'],
  ['complete', 8, 'invalid_transition', 'Pickup atau reservasi sudah berubah. Muat ulang untuk melihat status terbaru.'],
  ['complete', 8, 'quantity_conflict', 'Pickup berubah dan tidak dapat diselesaikan. Muat ulang untuk melihat status terbaru.'],
  ['no-show', 7, 'deadline_passed', 'Batas resource sudah lewat. Pickup tidak dapat ditandai tidak hadir.'],
  ['no-show', 7, 'invalid_transition', 'Pickup atau reservasi sudah berubah. Muat ulang untuk melihat status terbaru.'],
  ['no-show', 7, 'quantity_conflict', 'Pickup berubah dan tidak dapat ditandai tidak hadir. Muat ulang untuk melihat status terbaru.'],
] as const)('reports %s %s without showing false success', async (action, userId, code, expectedMessage) => {
  await mount('/pickups/12', userId, {
    scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  })
  actionFailure = { status: 409, code }

  if (action === 'complete') {
    await clickButton('Konfirmasi penerimaan')
    await clickButton('Ya, saya sudah menerima')
    expect(dialogWithTitle('Konfirmasi penerimaan?')?.textContent).toContain(expectedMessage)
  } else {
    await clickButton('Tandai tidak hadir')
    await setTextarea('Receiver tidak hadir.', 'reason')
    await clickButton('Ya, tandai tidak hadir')
    expect(dialogWithTitle('Tandai pickup tidak hadir?')?.textContent).toContain(expectedMessage)
  }

  expect(container.textContent).toContain('Pickup terjadwal')
  expect(container.textContent).not.toContain('Pickup selesai')
  expect(container.textContent).not.toContain('Pickup tidak terlaksana')
})

it('hides actions at the exact scheduled and resource deadline boundaries', async () => {
  const now = Date.now()
  vi.spyOn(Date, 'now').mockReturnValue(now)

  await mount('/pickups/12', 7, {
    scheduledAt: new Date(now).toISOString(),
    deadline: new Date(now + 60_000).toISOString(),
  })
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Tandai tidak hadir')

  await act(async () => root.unmount())
  await mount('/pickups/12', 8, {
    scheduledAt: new Date(now - 60_000).toISOString(),
    deadline: new Date(now).toISOString(),
  })
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Konfirmasi penerimaan')

  await act(async () => root.unmount())
  await mount('/pickups/12', 7, {
    scheduledAt: new Date(now - 60_000).toISOString(),
    deadline: new Date(now).toISOString(),
  })
  expect(visibleButtons().map(button => button.textContent?.trim())).not.toContain('Tandai tidak hadir')
})

it('keeps completion scheduled and reports a network failure without false success', async () => {
  await mount('/pickups/12', 8)
  actionNetworkFailure = true
  await clickButton('Konfirmasi penerimaan')
  await clickButton('Ya, saya sudah menerima')

  expect(dialogWithTitle('Konfirmasi penerimaan?')?.textContent)
    .toContain('Konfirmasi penerimaan belum berhasil. Periksa koneksi lalu coba lagi.')
  expect(container.textContent).toContain('Pickup terjadwal')
  expect(container.textContent).not.toContain('Penerimaan dicatat')
})

it('keeps no-show scheduled and reports a network failure without false success', async () => {
  await mount('/pickups/12', 7, {
    scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  })
  actionNetworkFailure = true
  await clickButton('Tandai tidak hadir')
  await setTextarea('Receiver tidak hadir.', 'reason')
  await clickButton('Ya, tandai tidak hadir')

  expect(dialogWithTitle('Tandai pickup tidak hadir?')?.textContent)
    .toContain('No-show belum berhasil dicatat. Periksa koneksi lalu coba lagi.')
  expect(container.textContent).toContain('Pickup terjadwal')
  expect(container.textContent).not.toContain('Pickup tidak terlaksana')
  expect(container.textContent).not.toContain('Reservasi dibatalkan')
})

it('updates only instructions with CSRF and shows success after saving', async () => {
  await mount('/pickups/12/edit')
  await setTextarea('Ambil di pintu belakang.')
  const form = container.querySelector('form')!
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await settle()

  expect(writes.at(-1)).toMatchObject({
    url: expect.objectContaining({ pathname: '/api/v1/pickups/12/' }),
    method: 'PATCH',
    body: { instructions: 'Ambil di pintu belakang.' },
    csrf: 'pickup-test-csrf',
  })
  expect(container.textContent).toContain('Instruksi diperbarui')
})

it('blocks receiver edits and explains deadline conflicts from the API', async () => {
  await mount('/pickups/12/edit', 8)
  expect(container.textContent).toContain('Hanya provider pada reservation ini')
  expect(container.querySelector<HTMLTextAreaElement>('textarea')?.disabled).toBe(true)

  await act(async () => root.unmount())
  await mount('/pickups/12/edit')
  updateFailure = { status: 409, code: 'deadline_passed' }
  await setTextarea('Instruksi berubah')
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await settle()
  expect(container.textContent).toContain('Batas resource sudah lewat')
})
