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
import SupplyForm from './SupplyForm.tsx'
import EditSupply from './EditSupply.tsx'
import { claimable, listingChanges, listingValues, supplyPayload, validateSupply } from './model.ts'

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
let hasHistory = false
let removeStatus = 204
let actionWait: Promise<void> | undefined
let requests: { url: URL; method: string; body: Record<string, unknown> | null; csrf: string | null; credentials: RequestCredentials | undefined }[]
const ok = (data: unknown) => Response.json({ success: true, data })
const failed = (status: number, code = 'server_error', field: string | null = null) => Response.json({ success: false, message: 'Internal secret should not be rendered', errors: [{ field, code, message: field ? 'Jumlah ditolak server.' : 'Secret traceback' }] }, { status })
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) }) }
async function mount(path = '/supply', userId: number | null = null, referenceResponseStatus = 200) {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
  listing = structuredClone(fixture); writeStatus = 200; writeCode = 'invalid'; detailStatus = 200; referenceStatus = referenceResponseStatus; csrfStatus = 200; listResponse = undefined; requests = []; hasHistory = false; removeStatus = 204; actionWait = undefined
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
    if (url.pathname.endsWith('/close/') && method === 'POST') {
      if (actionWait) await actionWait
      if (writeStatus >= 400) return failed(writeStatus, writeCode, writeStatus === 400 ? 'reason' : null)
      listing = { ...listing, status: 'CLOSED', version: listing.version + 1 }
      return ok(listing)
    }
    if (method === 'DELETE') {
      if (actionWait) await actionWait
      if (removeStatus !== 204) return failed(removeStatus, writeCode)
      if (hasHistory) listing = { ...listing, status: ['AVAILABLE', 'RESERVED'].includes(listing.status) ? 'CLOSED' : listing.status, archived_at: '2026-10-28T00:00:00Z' }
      else listResponse = async () => ok({ count: 0, next: null, previous: null, results: [] })
      return new Response(null, { status: 204 })
    }
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
        { path: '/my/supply', element: <BrowseSupply mine /> }, { path: '/supply/new', element: <SupplyForm /> }, { path: '/supply/:id/edit', element: <EditSupply /> }, { path: '/supply/:id/claim', element: <p>Claim task</p> },
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
async function check(selector: string) { await act(async () => container.querySelector<HTMLInputElement>(selector)!.click()) }
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
const writes = () => requests.filter(request => ['POST', 'PATCH'].includes(request.method))
async function completeForm(mode = 'DONATE') {
  await input('[name="title"]', 'Roti gandum')
  await input('[name="description"]', 'Roti baru dikemas')
  await check(`[name="resource_type"][value="${food}"]`)
  await select('[name="category"]', 'prepared_meal')
  await check('[name="suitability"]')
  await input('[name="quantity_total"]', '10')
  await select('[name="unit"]', 'box')
  await check(`[name="mode"][value="${mode}"]`)
  if (mode === 'SELL') await input('[name="unit_price"]', '15000.50')
  await input('[name="condition"]', 'Kemasan utuh')
  await input('[name="available_until"]', '2099-11-01T17:30')
  await input('[type="search"]', 'Kampus UI')
  await click('Cari lokasi'); await click('Pilih')
}
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
it('offers edit to the owner, prevents self-claim and rejects a non-owner edit route', async () => {
  await mount('/supply/7', 1)
  expect(container.querySelector('a[href="/supply/7/edit"]')).not.toBeNull()
  expect(container.querySelector('a[href="/supply/7/claim"]')).toBeNull()
  await act(async () => { await router.navigate('/supply/7/edit') })
  expect(container.querySelector('form')).not.toBeNull()
  listing.owner.id = 2
  await act(async () => { await router.navigate('/supply/8/edit') }); await settle()
  expect(container.textContent).toContain('Akses ditolak')
  expect(container.querySelector('form')).toBeNull()
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
it.each(['DONATE', 'SELL'])('creates %s with selected location, CSRF and no readonly properties', async mode => {
  await mount('/supply/new', 1); await completeForm(mode); await submit()
  expect(writes()).toHaveLength(1)
  const request = writes()[0]
  expect(request.csrf).toBe('supply-token'); expect(request.credentials).toBe('include')
  expect(request.body).toMatchObject({ title: 'Roti gandum', quantity_total: '10', mode, unit_price: mode === 'SELL' ? '15000.50' : '0.00', location: pickup, available_until: '2099-11-01T17:30:00+07:00' })
  for (const key of ['id', 'owner', 'status', 'version', 'quantity_available']) expect(request.body).not.toHaveProperty(key)
  expect(request.body?.location).not.toHaveProperty('attribution')
  expect(router.state.location.pathname).toBe('/supply/7')
})
it('prevents double submission while CSRF or the mutation is pending', async () => {
  await mount('/supply/new', 1); await completeForm()
  await act(async () => {
    const form = container.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(writes()).toHaveLength(1)
  expect(requests.filter(item => item.url.pathname.endsWith('csrf/'))).toHaveLength(1)
})
it('validates before sending and clears incompatible category/suitability when resource type changes', async () => {
  await mount('/supply/new', 1); await submit(); expect(writes()).toHaveLength(0)
  expect(container.querySelector('[name="title"]')?.getAttribute('aria-invalid')).toBe('true')
  await completeForm(); await check(`[name="resource_type"][value="${waste}"]`)
  expect(container.querySelector<HTMLSelectElement>('[name="category"]')!.value).toBe('')
  expect(container.querySelector<HTMLInputElement>('[name="suitability"]')!.checked).toBe(false)
  await submit(); expect(writes()).toHaveLength(0)
})
it('prefills edit including the existing location and sends a minimal PATCH preserving second precision', async () => {
  await mount('/supply/7/edit', 1)
  expect(container.querySelector<HTMLInputElement>('[name="quantity_total"]')!.value).toBe('10')
  expect(container.textContent).toContain('Lokasi terpilih: Kampus UI Depok')
  await input('[name="description"]', 'Deskripsi diperbarui'); await submit()
  expect(writes()[0].method).toBe('PATCH')
  expect(writes()[0].body).toEqual({ description: 'Deskripsi diperbarui' })
})
it.each([[400, 'invalid'], [403, 'csrf_failed'], [403, 'permission_denied'], [409, 'quantity_floor'], [409, 'unit_locked'], [500, 'server_error'], [501, 'not_implemented']])('preserves edits after %s %s and does not show success', async (status, code) => {
  await mount('/supply/7/edit', 1)
  writeStatus = status as number; writeCode = code as string
  await input('[name="title"]', 'Unsaved title'); await submit()
  expect(router.state.location.pathname).toBe('/supply/7/edit')
  expect(container.querySelector<HTMLInputElement>('[name="title"]')!.value).toBe('Unsaved title')
  expect(container.textContent).toContain('Supply belum disimpan')
  expect(container.textContent).not.toContain('Internal secret')
  if (status === 400) expect(container.textContent).toContain('Jumlah ditolak server.')
  if (status === 409) expect(container.querySelector('a[target="_blank"]')).not.toBeNull()
})
it('redirects an expired write session to login with the edit destination', async () => {
  await mount('/supply/7/edit', 1); writeStatus = 401
  await input('[name="title"]', 'Changed'); await submit()
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/supply/7/edit' })
})
it('does not write if CSRF bootstrap fails', async () => {
  await mount('/supply/7/edit', 1); csrfStatus = 403
  await input('[name="title"]', 'Changed'); await submit()
  expect(writes()).toHaveLength(0)
  expect(container.textContent).toContain('Verifikasi keamanan gagal')
})
it('clears an expired session while loading edit and preserves the destination', async () => {
  await mount('/supply', 1); detailStatus = 401
  await act(async () => { await router.navigate('/supply/7/edit') }); await settle()
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/supply/7/edit' })
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
it('preserves terminal deadlines on PATCH, validates new deadlines, and keeps decimal quantities as strings', () => {
  const expired = { ...fixture, status: 'EXPIRED', available_until: '2020-01-01T00:00:45+07:00' }
  const values = listingValues(expired)
  values.description = 'Updated description'
  expect(validateSupply(values, references, expired)).toEqual({})
  expect(listingChanges(values, expired)).toEqual({ description: 'Updated description' })
  values.fields.deadline = '2019-12-01T17:30'
  expect(validateSupply(values, references, expired)).toHaveProperty('deadline')
  values.fields = { ...values.fields, unit: 'kg', quantity: '999999999.999' }
  expect(supplyPayload(values).quantity_total).toBe('999999999.999')
})


it('loads owner history with fixed scope=mine, status and pagination including archived entries', async () => {
  await mount('/my/supply?scope=public&status=CLOSED&page=2', 1)
  const request = requests.find(request => request.url.pathname.endsWith('listings/'))!
  expect(request.url.searchParams.get('scope')).toBe('mine')
  expect(request.url.searchParams.get('status')).toBe('CLOSED')
  expect(request.url.searchParams.get('page')).toBe('2')
  expect(container.textContent).toContain('Supply saya')
  expect(container.textContent).toContain('Dialokasikan')
  expect(container.textContent).toContain('Selesai diambil')
  await select('[aria-label="Status supply"]', 'EXPIRED')
  expect(router.state.location.search).not.toContain('page=')
  expect(requests.at(-1)!.url.searchParams.get('scope')).toBe('mine')
  expect(requests.at(-1)!.url.searchParams.get('status')).toBe('EXPIRED')
  listing = { ...listing, archived_at: '2026-10-01T00:00:00Z', status: 'CLOSED' }
  await select('[aria-label="Status supply"]', 'CLOSED')
  expect(container.textContent).toContain('Diarsipkan')
  expect(container.querySelector('a[href="/supply/7"]')).not.toBeNull()
  expect(container.textContent).not.toContain('Hapus supply')
})
it('guards owner history and hides management actions for nonowners', async () => {
  await mount('/my/supply', null)
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/my/supply' })
  expect(requests.some(request => request.url.pathname.endsWith('listings/'))).toBe(false)
})
it('does not render destructive controls to nonowners in detail', async () => {
  await mount('/supply/7', 2)
  expect(container.textContent).not.toContain('Hapus supply')
  expect(container.textContent).not.toContain('Tutup supply')
})
it('validates close reason, cancels without writes and sends trimmed JSON with CSRF', async () => {
  await mount('/supply/7', 1)
  await click('Tutup supply')
  expect(container.textContent).toContain('pengajuan pending dibatalkan')
  expect(container.textContent).toContain('Reservasi yang sudah diterima tetap berjalan')
  await click('Ya, tutup supply')
  expect(container.textContent).toContain('Isi alasan penutupan')
  expect(writes()).toHaveLength(0)
  await click('Batal')
  expect(writes()).toHaveLength(0)
  await click('Tutup supply')
  await input('[name="close_reason"]', '  Jadwal berubah.  ')
  await click('Ya, tutup supply'); await settle()
  const request = writes().find(request => request.url.pathname.endsWith('/close/'))!
  expect(request.body).toEqual({ reason: 'Jadwal berubah.' })
  expect(request.csrf).toBe('supply-token')
  expect(request.credentials).toBe('include')
  expect(container.textContent).toContain('Supply berhasil ditutup')
  expect(container.textContent).toContain('Ditutup')
  expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Tutup supply')!.disabled).toBe(true)
  expect(listing.quantity_allocated).toBe('3.000')
})
it.each(['CLOSED', 'EXPIRED', 'COMPLETED'])('disables close for terminal %s and keeps historical details accessible', async status => {
  await mount('/my/supply', 1)
  listing.status = status
  await select('[aria-label="Status supply"]', status)
  expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Tutup supply')!.disabled).toBe(true)
  expect(container.querySelector('a[href="/supply/7"]')).not.toBeNull()
  expect(container.textContent).toContain('Hapus supply')
})
it('does not close an elapsed deadline or fully completed supply even with stale AVAILABLE status', async () => {
  await mount('/my/supply', 1)
  listing.available_until = '2020-01-01T00:00:00Z'
  await select('[aria-label="Status supply"]', 'AVAILABLE')
  expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Tutup supply')!.disabled).toBe(true)
  listing.available_until = fixture.available_until; listing.quantity_completed = listing.quantity_total
  await select('[aria-label="Status supply"]', '')
  expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Tutup supply')!.disabled).toBe(true)
})
it.each([400, 403, 404, 409, 500, 501])('retains close reason and allows recovery after %s without false success', async status => {
  await mount('/supply/7', 1); writeStatus = status; writeCode = status === 409 ? 'invalid_transition' : 'csrf_failed'
  await click('Tutup supply'); await input('[name="close_reason"]', 'Tetap disimpan')
  await click('Ya, tutup supply'); await settle()
  expect(container.textContent).toContain('Perubahan belum dapat dikonfirmasi')
  expect(container.textContent).not.toContain('Supply berhasil ditutup')
  expect(container.textContent).not.toContain('Secret traceback')
  expect(container.querySelector<HTMLTextAreaElement>('[name="close_reason"]')!.value).toBe('Tetap disimpan')
  expect(container.querySelector<HTMLDialogElement>('dialog')!.open).toBe(true)
  writeStatus = 200
  await click('Ya, tutup supply'); await settle()
  expect(container.textContent).toContain('Supply berhasil ditutup')
})
it('prevents duplicate submissions and dismissal while close is pending', async () => {
  await mount('/supply/7', 1)
  let release!: () => void
  actionWait = new Promise<void>(resolve => { release = resolve })
  await click('Tutup supply'); await input('[name="close_reason"]', 'Selesai')
  await click('Ya, tutup supply')
  const confirm = [...container.querySelectorAll<HTMLButtonElement>('dialog button')].find(button => button.textContent?.includes('Ya, tutup'))!
  expect(confirm.disabled).toBe(true)
  expect([...container.querySelectorAll<HTMLButtonElement>('dialog button')].find(button => button.textContent === 'Batal')!.disabled).toBe(true)
  await act(async () => confirm.click())
  expect(writes().filter(request => request.url.pathname.endsWith('/close/'))).toHaveLength(1)
  release(); await settle()
  expect(container.textContent).toContain('Supply berhasil ditutup')
})
it.each([false, true])('handles empty DELETE 204 and refreshes owner history, transaction history=%s', async history => {
  await mount('/my/supply', 1); hasHistory = history
  await click('Hapus supply')
  expect(container.textContent).toContain('termasuk yang ditolak atau dibatalkan')
  expect(container.textContent).toContain('jadwal pickup tetap berjalan')
  await click('Ya, hapus atau arsipkan'); await settle()
  const request = requests.find(request => request.method === 'DELETE')!
  expect(request.body).toBeNull()
  expect(request.csrf).toBe('supply-token')
  expect(router.state.location.pathname).toBe('/my/supply')
  expect(container.textContent).toContain('Supply berhasil dihapus atau diarsipkan')
  if (history) {
    expect(container.textContent).toContain('Diarsipkan')
    expect(container.querySelector('a[href="/supply/7"]')).not.toBeNull()
  } else expect(container.textContent).toContain('Belum ada supply pada pilihan ini')
})
it.each(['AVAILABLE', 'RESERVED', 'CLOSED', 'EXPIRED', 'COMPLETED'])('permits server-decided deletion or archival for %s', async status => {
  await mount('/my/supply', 1); hasHistory = true; listing.status = status
  await select('[aria-label="Status supply"]', status)
  await click('Hapus supply'); await click('Ya, hapus atau arsipkan'); await settle()
  expect(requests.filter(request => request.method === 'DELETE')).toHaveLength(1)
  expect(listing.archived_at).not.toBeNull()
  if (['CLOSED', 'EXPIRED', 'COMPLETED'].includes(status)) expect(listing.status).toBe(status)
})
it('keeps a failed delete dialog open and does not remove the listing optimistically', async () => {
  await mount('/my/supply', 1); removeStatus = 500
  await click('Hapus supply'); await click('Ya, hapus atau arsipkan'); await settle()
  expect(container.textContent).toContain('Perubahan belum dapat dikonfirmasi')
  expect(container.textContent).toContain(fixture.title)
  expect(container.textContent).not.toContain('Supply berhasil dihapus')
  removeStatus = 204
  await click('Ya, hapus atau arsipkan'); await settle()
  expect(container.textContent).toContain('Supply berhasil dihapus atau diarsipkan')
})
it('redirects expired lifecycle sessions without showing success', async () => {
  await mount('/supply/7', 1); writeStatus = 401
  await click('Tutup supply'); await input('[name="close_reason"]', 'Alasan')
  await click('Ya, tutup supply'); await settle()
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state).toEqual({ from: '/my/supply' })
})
it('does not issue DELETE if CSRF bootstrap fails', async () => {
  await mount('/my/supply', 1); csrfStatus = 403
  await click('Hapus supply'); await click('Ya, hapus atau arsipkan'); await settle()
  expect(requests.filter(request => request.method === 'DELETE')).toHaveLength(0)
  expect(container.textContent).toContain('Verifikasi keamanan gagal')
})
it('renders owner-list failures and recovers without confusing them with empty history', async () => {
  await mount('/my/supply', 1)
  listResponse = async () => failed(501)
  await select('[aria-label="Status supply"]', 'CLOSED')
  expect(container.textContent).toContain('Layanan supply belum tersedia')
  expect(container.textContent).not.toContain('Belum ada supply pada pilihan ini')
  listResponse = async () => ok({ count: 0, next: null, previous: null, results: [] })
  await click('Coba lagi'); await settle()
  expect(container.textContent).toContain('Belum ada supply pada pilihan ini')
})
