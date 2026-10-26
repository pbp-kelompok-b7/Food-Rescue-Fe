import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from './context.ts'
import RequireAuth from './RequireAuth.tsx'
import RequireAdmin from './RequireAdmin.tsx'
import AppLayout from '../layouts/AppLayout.tsx'
import HomePage from '../routes/home.tsx'
import NotFoundPage from '../pages/NotFoundPage.tsx'
import { ApiError } from '../services/api.ts'
import { errorCopy } from '../services/errors.ts'
import RouteError from '../components/RouteError.tsx'
import AuthProvider from './AuthProvider.tsx'
import * as authApi from '../services/auth.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
let router: ReturnType<typeof createMemoryRouter>
const anonymous: AuthState = { status: 'anonymous', user: null, error: null }
const account: AuthState = { status: 'authenticated', user: { id: 1, display_name: 'Nama dari backend', is_admin: false }, error: null }

async function render(auth: AuthState, path = '/') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  router = createMemoryRouter([{
    element: <AuthContext value={{ ...auth, refresh: vi.fn() }}><AppLayout /></AuthContext>,
    children: [
      { index: true, element: <HomePage /> },
      { path: '/login', element: <h1>Masuk akun</h1> },
      { path: '/supply', element: <h1>Supply publik</h1> },
      { path: '/error/:status', loader: ({ params }) => { throw new Response(null, { status: Number(params.status) }) }, element: <h1>Unreachable</h1>, errorElement: <RouteError /> },
      { element: <RequireAuth />, children: [
        { path: '/profile', element: <h1>Profil privat</h1> },
        { element: <RequireAdmin />, children: [{ path: '/admin', element: <h1>Panel admin</h1> }] },
      ] },
      { path: '*', element: <NotFoundPage /> },
    ],
  }], { initialEntries: [path] })
  await act(async () => root.render(<RouterProvider router={router} />))
}

afterEach(async () => {
  await act(async () => root?.unmount())
  router?.dispose()
  container?.remove()
  vi.restoreAllMocks()
})

describe('shared navigation and access', () => {
  it('gives guests both browse paths and describes the actual resource/mode options', async () => {
    await render(anonymous)
    for (const text of ['Makanan siap konsumsi', 'Bahan organik', 'didonasikan atau dijual', 'Contoh tampilan listing, bukan ketersediaan langsung.']) expect(container.textContent).toContain(text)
    expect(container.querySelector('main a[href="/supply"]')).not.toBeNull()
    expect(container.querySelector('main a[href="/requests"]')).not.toBeNull()
    expect(container.querySelector('header a[href="/login"]')).not.toBeNull()
    expect(container.querySelector('a[href="#main-content"]')).not.toBeNull()
  })

  it('preserves a protected deep link including query and hash on guest redirect', async () => {
    await render(anonymous, '/profile?tab=contact#whatsapp')
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state.from).toBe('/profile?tab=contact#whatsapp')
    expect(container.textContent).not.toContain('Profil privat')
  })

  it('waits for session resolution without showing guest login or protected content', async () => {
    await render({ status: 'loading', user: null, error: null }, '/admin')
    expect(container.textContent).toContain('Memeriksa sesi')
    expect(container.querySelector('a[href="/login"]')).toBeNull()
    expect(container.textContent).not.toContain('Panel admin')
  })

  it.each([403, 404, 501, 500])('blocks protected content when session lookup returns %s', async (status) => {
    await render({ status: 'error', user: null, error: new ApiError('error', status, null) }, '/admin')
    expect(container.textContent).toContain(errorCopy(status).message)
    expect(container.textContent).not.toContain('Panel admin')
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('lets a normal account enter private pages and shows its server display name', async () => {
    await render(account, '/profile')
    expect(container.textContent).toContain('Profil privat')
    expect(container.textContent).toContain('Nama dari backend')
    expect(container.querySelector('footer a[href="/login"]')).toBeNull()
    expect(container.querySelector('a[href="/admin"]')).toBeNull()
  })

  it('rejects a nonadmin even if an unrelated is_staff flag is present', async () => {
    await render({ ...account, user: { ...account.user!, is_staff: true } }, '/admin')
    expect(container.textContent).toContain('Akses ditolak')
    expect(container.textContent).not.toContain('Panel admin')
  })

  it('permits the server admin flag and exposes the moderation destination', async () => {
    await render({ ...account, user: { ...account.user!, is_admin: true } }, '/admin')
    expect(container.textContent).toContain('Panel admin')
    expect(container.querySelector('a[href="/admin"]')).not.toBeNull()
  })

  it('closes mobile disclosure after route navigation and focuses main', async () => {
    await render(anonymous)
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="Buka navigasi"]')!
    await act(async () => button.click())
    expect(button.getAttribute('aria-expanded')).toBe('true')
    await act(async () => router.navigate('/supply'))
    expect(container.querySelector('button[aria-label="Buka navigasi"]')?.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement?.id).toBe('main-content')
  })

  it('renders unknown deep links inside the shared shell', async () => {
    await render(anonymous, '/does-not-exist')
    expect(container.textContent).toContain('Halaman tidak ditemukan')
    expect(container.querySelector('header')).not.toBeNull()
    expect(container.querySelector('footer')).not.toBeNull()
  })

  it.each([401, 403, 404, 501])('renders route errors with recovery actions for %s', async (status) => {
    await render(anonymous, `/error/${status}`)
    expect(container.textContent).toContain(errorCopy(status).title)
    expect(container.textContent).toContain(errorCopy(status).message)
    expect(container.querySelector('a[href="/"]')).not.toBeNull()
  })

  it('turns an actual session-client 401 into a guest redirect', async () => {
    vi.spyOn(authApi, 'getSession').mockRejectedValue(new ApiError('Expired', 401, null))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    router = createMemoryRouter([{
      element: <AuthProvider><RequireAuth /></AuthProvider>,
      children: [{ path: '/profile', element: <h1>Private</h1> }],
    }, { path: '/login', element: <h1>Login destination</h1> }], { initialEntries: ['/profile'] })
    await act(async () => root.render(<RouterProvider router={router} />))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    expect(router.state.location.pathname).toBe('/login')
    expect(container.textContent).not.toContain('Private')
  })

  it('redirects only once while the lazy login module is pending', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    let finishLogin: () => void = () => {}
    const pendingLogin = new Promise<void>(resolve => { finishLogin = resolve })
    router = createMemoryRouter([{
      element: <AuthContext value={{ ...anonymous, refresh: vi.fn() }}><RequireAuth /></AuthContext>,
      children: [{ path: '/profile', element: <h1>Private</h1> }],
    }, { path: '/login', lazy: async () => { await pendingLogin; return { Component: () => <h1>Lazy login</h1> } } }], { initialEntries: ['/profile'] })
    const navigate = vi.spyOn(router, 'navigate')
    await act(async () => root.render(<RouterProvider router={router} />))
    expect(navigate).toHaveBeenCalledTimes(1)
    await act(async () => finishLogin())
    expect(router.state.location.pathname).toBe('/login')
    expect(container.textContent).toContain('Lazy login')
  })
})
