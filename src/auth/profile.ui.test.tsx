import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from './AuthProvider.tsx'
import RequireAuth from './RequireAuth.tsx'
import { useAuth } from './useAuth.ts'
import Profile from '../routes/auth/profile.tsx'
import { setCsrfToken } from '../services/api.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let getStatus = 200
let patchStatus = 200
let logoutStatus = 204
let requests: { path: string; method: string; body: unknown; csrf: string | null }[]
let user: { id: number; display_name: string; email: string; whatsapp_number: string | null }
const ok = (data: unknown) => Response.json({ success: true, data })
function AccountName() { return <p data-account>{useAuth().user?.display_name}</p> }
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) }) }
async function mount(status = 200) {
  getStatus = status; patchStatus = 200; logoutStatus = 204; requests = []
  user = { id: 1, display_name: 'Rani', email: 'rani@example.test', whatsapp_number: null }
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit & { headers: Headers }) => {
    const method = options.method || 'GET'
    const body = options.body ? JSON.parse(String(options.body)) : null
    requests.push({ path, method, body, csrf: options.headers.get('X-CSRFToken') })
    if (path.endsWith('session/')) return ok({ authenticated: true, user: { ...user, display_name: 'Old session name' } })
    if (path.endsWith('csrf/')) return ok({ csrf_token: 'profile-token' })
    if (path.endsWith('logout/')) return new Response(null, { status: logoutStatus })
    if (path.endsWith('users/me/')) {
      const status = method === 'PATCH' ? patchStatus : getStatus
      if (status !== 200) return Response.json({ success: false, errors: [{ field: 'whatsapp_number', code: 'invalid', message: 'Nomor ditolak server.' }] }, { status })
      if (method === 'PATCH') user = { ...user, ...body }
      return ok(user)
    }
    throw new Error(`Unexpected path ${path}`)
  }))
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><AccountName /><RequireAuth /></AuthProvider>,
    children: [{ path: '/profile', element: <Profile /> }],
  }, { path: '/login', element: <h1>Masuk</h1> }, { path: '/', element: <h1>Beranda</h1> }], { initialEntries: ['/profile'] })
  await act(async () => root.render(<RouterProvider router={router} />)); await settle()
}
function fill(name: string, value: string) { container.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value = value }
async function submit() { await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) }) }
const patches = () => requests.filter(request => request.method === 'PATCH')
afterEach(async () => {
  await act(async () => root?.unmount()); router?.dispose(); container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); setCsrfToken(null)
})

it('loads the server profile, keeps email read-only, and explains contact privacy and scheduling', async () => {
  await mount()
  expect(container.querySelector<HTMLInputElement>('[name="display_name"]')!.value).toBe('Rani')
  expect(container.querySelector<HTMLInputElement>('[type="email"]')!.readOnly).toBe(true)
  expect(container.textContent).toContain('Kedua pihak wajib melengkapi WhatsApp sebelum provider menjadwalkan pickup.')
  expect(container.textContent).toContain('ACCEPTED')
})

it('sends only editable fields with CSRF and syncs the account without remounting the page', async () => {
  await mount(); fill('display_name', ' Rani Putri '); fill('whatsapp_number', '+6281234567890')
  await submit()
  expect(patches()).toHaveLength(1)
  expect(patches()[0].body).toEqual({ display_name: 'Rani Putri', whatsapp_number: '+6281234567890' })
  expect(patches()[0].csrf).toBe('profile-token')
  expect(container.querySelector('[data-account]')!.textContent).toBe('Rani Putri')
  expect(container.textContent).toContain('Profil berhasil diperbarui.')
  expect(requests.filter(request => request.path.endsWith('session/'))).toHaveLength(1)
})

it('saves an empty contact as null', async () => {
  await mount(); fill('whatsapp_number', ' '); await submit()
  expect(patches()[0].body).toEqual({ display_name: 'Rani', whatsapp_number: null })
})

it('prevents duplicate submissions and logout while saving', async () => {
  await mount()
  await act(async () => {
    const form = container.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Keluar dari akun')!.click()
  })
  expect(patches()).toHaveLength(1)
  expect(requests.some(request => request.path.endsWith('logout/'))).toBe(false)
})

it.each(['081234567890', '+62 81234567890', '+0123456789', '+62812'])('rejects invalid E.164 contact %s before sending', async number => {
  await mount(); fill('whatsapp_number', number); await submit()
  expect(patches()).toHaveLength(0)
  const input = container.querySelector('[name="whatsapp_number"]')!
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(document.activeElement).toBe(input)
})

it('rejects blank names and preserves entered values and mapped API errors after failure', async () => {
  await mount(); fill('display_name', ' '); await submit(); expect(patches()).toHaveLength(0)
  fill('display_name', 'Unsaved name'); fill('whatsapp_number', '+6281234567890'); patchStatus = 400
  await submit()
  expect(container.textContent).toContain('Nomor ditolak server.')
  expect(container.querySelector<HTMLInputElement>('[name="display_name"]')!.value).toBe('Unsaved name')
  expect(container.textContent).not.toContain('Profil berhasil diperbarui.')
  patchStatus = 200; await submit(); expect(container.textContent).toContain('Profil berhasil diperbarui.')
})

it('retries a failed profile load', async () => {
  await mount(503); expect(container.textContent).toContain('Profil gagal dimuat')
  getStatus = 200
  await act(async () => { Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Coba lagi')!.click() }); await settle()
  expect(container.querySelector('form')).not.toBeNull()
})

it.each(['load', 'save'] as const)('clears expired sessions during %s and returns to login', async stage => {
  await mount(stage === 'load' ? 401 : 200)
  if (stage === 'save') { patchStatus = 401; await submit() }
  expect(router.state.location.pathname).toBe('/login')
  expect(router.state.location.state.from).toBe('/profile')
})

it('keeps the session on logout failure and logs out successfully on retry', async () => {
  await mount(); logoutStatus = 503
  const button = () => Array.from(container.querySelectorAll('button')).find(item => item.textContent === 'Keluar dari akun')!
  await act(async () => button().click()); expect(router.state.location.pathname).toBe('/profile')
  logoutStatus = 204; await act(async () => button().click()); expect(router.state.location.pathname).toBe('/login')
})
