import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from './AuthProvider.tsx'
import RequireAuth from './RequireAuth.tsx'
import AppLayout from '../layouts/AppLayout.tsx'
import LoginPage from '../routes/auth/login.tsx'
import RegisterPage from '../routes/auth/register.tsx'
import { setCsrfToken } from '../services/api.ts'
import type { GoogleCredentialResponse, GoogleIdentity } from './googleIdentity.ts'
import * as googleIdentity from './googleIdentity.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
let authenticated = false
let csrfFailed = false
let loginStatus = 200
let sessionStatus = 200
let registerErrors: { field: string | null; code: string; message: string }[] = []
let logoutStatus = 204
let googleStatus = 200
let googleCode = ''
let googleCallback: ((response: GoogleCredentialResponse) => void) | undefined
let googleApi: GoogleIdentity
const user = { id: 1, email: 'rina@example.com', display_name: 'Rina', is_admin: false, is_active: true }
let requests: { path: string; body: Record<string, unknown> | null; token: string | null }[]

function ok(data: unknown, status = 200) { return Response.json({ success: true, data }, { status }) }

async function mount(path = '/login', googleClientId = '') {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', googleClientId)
  authenticated = false
  csrfFailed = false
  loginStatus = sessionStatus = 200
  logoutStatus = 204
  googleStatus = 200
  googleCode = ''
  googleCallback = undefined
  googleApi = {
    initialize: vi.fn(options => { googleCallback = options.callback }),
    renderButton: vi.fn(element => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Lanjutkan dengan Google'
      button.onclick = () => googleCallback?.({ credential: 'opaque-google-id-token' })
      element.append(button)
    }),
    disableAutoSelect: vi.fn(),
  }
  if (googleClientId) vi.stubGlobal('google', { accounts: { id: googleApi } })
  registerErrors = []
  requests = []
  vi.stubGlobal('fetch', vi.fn(async (path: string, options: RequestInit & { headers: Headers }) => {
    requests.push({ path, body: options.body ? JSON.parse(String(options.body)) : null, token: options.headers.get('X-CSRFToken') })
    if (path.endsWith('csrf/')) return ok({ csrf_token: authenticated ? 'rotated-token' : 'guest-token' })
    if (path.endsWith('session/')) {
      if (sessionStatus !== 200) return Response.json({ success: false }, { status: sessionStatus })
      return ok({ authenticated, user: authenticated ? user : null })
    }
    if (path.endsWith('register/')) return registerErrors.length ? Response.json({ success: false, errors: registerErrors }, { status: 400 }) : ok(user, 201)
    if (path.endsWith('google/')) {
      if (googleStatus !== 200) return Response.json({ success: false, message: 'Private Google error', errors: [{ field: null, code: googleCode, message: 'Private Google error' }] }, { status: googleStatus })
      authenticated = true
      return ok({ authenticated: true, user })
    }
    if (path.endsWith('login/')) {
      if (csrfFailed) return Response.json({ success: false, errors: [{ field: null, code: 'csrf_failed', message: 'CSRF Failed' }] }, { status: 403 })
      if (loginStatus !== 200) return Response.json({ success: false, message: 'Private internal detail', errors: [{ field: null, code: 'invalid_credentials', message: 'Private internal detail' }] }, { status: loginStatus })
      authenticated = true
      return ok(user)
    }
    if (path.endsWith('logout/')) {
      if (logoutStatus === 204 || logoutStatus === 401) authenticated = false
      return logoutStatus === 204 ? new Response(null, { status: 204 }) : Response.json({ success: false }, { status: logoutStatus })
    }
    throw new Error(`Unexpected API path: ${path}`)
  }))
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthProvider><AppLayout /></AuthProvider>,
    children: [
      { path: '/', element: <h1>Beranda</h1> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { element: <RequireAuth />, children: [{ path: '/profile', element: <h1>Profil privat</h1> }] },
    ],
  }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />))
  await settle()
}

async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) }) }
function fill(name: string, value: string) { container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value = value }
function credentials() { fill('email', 'RINA@EXAMPLE.COM'); fill('password', ' ExampleOnly!234 ') }
async function submit() { await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) }) }
async function go(path: string) { await act(async () => { await router.navigate(path) }) }

afterEach(async () => {
  await act(async () => root?.unmount())
  router?.dispose()
  container?.remove()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  setCsrfToken(null)
})

it('registers only contract fields, keeps the destination and goes to login without signing in', async () => {
  await mount('/register?next=%2Fprofile%3Ftab%3Dcontact%23whatsapp')
  credentials()
  fill('display_name', ' Rina ')
  await submit()
  expect(requests.find(item => item.path.endsWith('register/'))?.body).toEqual({ email: 'rina@example.com', password: ' ExampleOnly!234 ', display_name: 'Rina', whatsapp_number: null })
  expect(router.state.location.pathname).toBe('/login')
  expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/profile?tab=contact#whatsapp')
  expect(container.textContent).toContain('Akun berhasil dibuat')
  expect(authenticated).toBe(false)
  expect(requests.some(item => item.path.endsWith('login/'))).toBe(false)
  expect(container.querySelector<HTMLInputElement>('[name="email"]')?.value).toBe('rina@example.com')
})

it('validates registration and connects field errors to their controls without sending a write', async () => {
  await mount('/register')
  credentials()
  fill('display_name', '   ')
  fill('password', 'short')
  fill('whatsapp_number', '081234567890')
  await submit()
  expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(3)
  expect(document.activeElement?.getAttribute('name')).toBe('password')
  expect(requests.some(item => item.path.endsWith('register/'))).toBe(false)
})

it('maps backend password validation to the input and sends optional WhatsApp in E.164', async () => {
  await mount('/register')
  registerErrors = [{ field: 'password', code: 'password_too_common', message: 'Kata sandi terlalu umum.' }]
  credentials()
  fill('display_name', 'Rina')
  fill('whatsapp_number', '+6281234567890')
  await submit()
  const input = container.querySelector<HTMLInputElement>('[name="password"]')!
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Kata sandi terlalu umum.')
  expect(requests.find(item => item.path.endsWith('register/'))?.body?.whatsapp_number).toBe('+6281234567890')
})

it('preserves a guarded destination through signup/login, restores session and logs out on 204', async () => {
  await mount('/profile?tab=contact#whatsapp')
  expect(router.state.location.pathname).toBe('/login')
  const signup = container.querySelector<HTMLAnchorElement>('a[href^="/register?next="]')!
  expect(signup).not.toBeNull()
  await go(signup.getAttribute('href')!)
  const signin = container.querySelector<HTMLAnchorElement>('a[href^="/login?next="]')!
  await go(signin.getAttribute('href')!)
  credentials()
  await submit()
  expect(router.state.location.pathname + router.state.location.search + router.state.location.hash).toBe('/profile?tab=contact#whatsapp')
  expect(container.textContent).toContain('Profil privat')
  expect(requests.find(item => item.path.endsWith('login/'))?.token).toBe('guest-token')
  // Mount a fresh provider, as happens when the document reloads.
  await act(async () => { root.render(<RouterProvider key="reload" router={router} />) })
  await settle()
  expect(container.textContent).toContain('Profil privat')
  const logout = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Keluar')!
  await act(async () => logout.click())
  expect(router.state.location.pathname).toBe('/login')
  expect(container.textContent).not.toContain('Profil privat')
  expect(requests.find(item => item.path.endsWith('logout/'))?.token).toBe('rotated-token')
})

it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/login', '/register'])('rejects unsafe or looping destination %s', async destination => {
  await mount(`/login?next=${encodeURIComponent(destination)}`)
  credentials()
  await submit()
  expect(router.state.location.pathname).toBe('/')
})

it('keeps invalid and inactive credentials indistinguishable without rendering server details', async () => {
  await mount()
  loginStatus = 401
  credentials()
  await submit()
  expect(container.textContent).toContain('Email atau kata sandi salah, atau akun tidak aktif.')
  expect(container.textContent).not.toContain('Private internal detail')
  expect(router.state.location.pathname).toBe('/login')
})

it('allows retry after a CSRF failure and fetches a fresh token', async () => {
  await mount()
  csrfFailed = true
  credentials()
  await submit()
  expect(container.textContent).toContain('Verifikasi keamanan gagal')
  csrfFailed = false
  await submit()
  expect(router.state.location.pathname).toBe('/')
  expect(requests.filter(item => item.path.endsWith('csrf/'))).toHaveLength(3)
})

it('blocks duplicate submits even before React updates the disabled button', async () => {
  await mount()
  credentials()
  await act(async () => {
    const form = container.querySelector('form')!
    for (let attempt = 0; attempt < 2; attempt++) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(requests.filter(item => item.path.endsWith('login/'))).toHaveLength(1)
})

it.each([500, 501])('shows session service error %s with retry and does not expose protected content', async status => {
  await mount()
  sessionStatus = status
  await go('/profile')
  // Re-mount the whole route tree to bootstrap a new session.
  await act(async () => root.render(<RouterProvider key="service-error" router={router} />))
  await settle()
  expect(container.textContent).toContain('Sesi belum dapat diperiksa')
  expect(container.textContent).not.toContain('Profil privat')
})

it.each([401, 204])('clears session after logout %s even if subsequent session lookup would fail', async status => {
  await mount()
  credentials()
  await submit()
  await go('/profile')
  logoutStatus = status
  sessionStatus = 501
  const logout = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Keluar')!
  await act(async () => logout.click())
  expect(router.state.location.pathname).toBe('/login')
  expect(container.textContent).not.toContain('Profil privat')
  expect(container.querySelector('form')).not.toBeNull()
})

it.each(['/login', '/register'])('exchanges Google credentials for a server session from %s and restores the destination', async path => {
  await mount(`${path}?next=%2Fprofile%3Ftab%3Dcontact%23whatsapp`, `test-${path.slice(1)}.apps.googleusercontent.com`)
  const googleButton = container.querySelector<HTMLButtonElement>('[aria-label="Lanjutkan dengan Google"] button')!
  expect(googleButton).not.toBeNull()
  await act(async () => googleButton.click())
  expect(requests.find(item => item.path.endsWith('google/'))).toMatchObject({ body: { credential: 'opaque-google-id-token' }, token: 'guest-token' })
  expect(requests.filter(item => item.path.endsWith('csrf/'))).toHaveLength(2)
  expect(router.state.location.pathname + router.state.location.search + router.state.location.hash).toBe('/profile?tab=contact#whatsapp')
  expect(container.textContent).toContain('Profil privat')
  expect(requests.some(item => item.path.endsWith('register/'))).toBe(false)
  const logout = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Keluar')!
  await act(async () => logout.click())
  expect(googleApi.disableAutoSelect).toHaveBeenCalledOnce()
})

it.each([
  [409, 'account_link_required', 'Masuk dengan metode akun yang sudah ada.'],
  [503, 'google_unavailable', 'Google Sign-In sementara tidak tersedia.'],
  [401, 'invalid_credentials', 'Login Google gagal atau akun tidak aktif.'],
  [403, 'csrf_failed', 'Verifikasi keamanan gagal.'],
])('handles Google %s/%s without exposing server details or authenticating', async (status, code, message) => {
  await mount('/login', `test-${code}.apps.googleusercontent.com`)
  googleStatus = Number(status)
  googleCode = String(code)
  await act(async () => { googleCallback?.({ credential: 'rejected-token' }) })
  expect(container.textContent).toContain(message)
  expect(container.textContent).not.toContain('Private Google error')
  expect(authenticated).toBe(false)
  expect(router.state.location.pathname).toBe('/login')
  expect(container.querySelector('form')).not.toBeNull()
})

it('prevents duplicate Google callbacks and ignores callbacks after leaving auth', async () => {
  await mount('/login', 'test-duplicate.apps.googleusercontent.com')
  await act(async () => {
    googleCallback?.({ credential: 'duplicate-token' })
    googleCallback?.({ credential: 'duplicate-token' })
  })
  expect(requests.filter(item => item.path.endsWith('google/'))).toHaveLength(1)
  await act(async () => { googleCallback?.({ credential: 'late-token' }) })
  expect(requests.filter(item => item.path.endsWith('google/'))).toHaveLength(1)
})

it('keeps email login usable when the Google client ID is absent', async () => {
  await mount()
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent?.includes('Lanjutkan dengan Google'))!
  await act(async () => button.click())
  expect(container.textContent).toContain('Google Sign-In belum dikonfigurasi')
  credentials()
  await submit()
  expect(router.state.location.pathname).toBe('/')
})

it('keeps email login usable after the Google SDK fails to load', async () => {
  vi.spyOn(googleIdentity, 'loadGoogleIdentity').mockRejectedValue(new Error('Blocked SDK'))
  await mount('/login', 'test-failure.apps.googleusercontent.com')
  expect(container.textContent).toContain('Google Sign-In gagal dimuat')
  credentials()
  await submit()
  expect(router.state.location.pathname).toBe('/')
})
