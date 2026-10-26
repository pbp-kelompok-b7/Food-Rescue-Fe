import { Outlet, useLocation, useNavigation } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import Navbar from '../components/navigation/Navbar.tsx'
import Footer from '../components/navigation/Footer.tsx'
import { useAuth } from '../auth/useAuth.ts'
import { logout } from '../services/auth.ts'
import { ApiError } from '../services/api.ts'
import Alert from '../components/ui/Alert.tsx'
import Button from '../components/ui/Button.tsx'

export { default as ErrorBoundary } from '../components/RouteError.tsx'

export default function AppLayout() {
  const { pathname, search } = useLocation()
  const landing = pathname === '/'
  const authPage = pathname === '/login' || pathname === '/register'
  const profilePage = pathname === '/profile'
  const navigation = useNavigation()
  const auth = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutPending = useRef(false)
  const [logoutError, setLogoutError] = useState(false)
  const user = auth.status === 'authenticated' ? auth.user : null
  const accountLinks = [
    { to: '/profile', label: 'Profil saya' },
    { to: '/my/supply', label: 'Supply saya' },
    { to: '/my/requests', label: 'Request saya' },
    { to: '/reservations', label: 'Reservasi' },
    { to: '/pickups', label: 'Pickup' },
    ...(user?.is_admin ? [{ to: '/admin', label: 'Moderasi admin' }] : []),
  ]
  const footerGroups = [
    { title: 'Jelajahi', links: [{ to: '/supply', label: 'Cari resource' }, { to: '/requests', label: 'Papan request' }, ...(landing || authPage ? [{ to: '/#cara-kerja', label: 'Cara kerja' }] : [])] },
    { title: 'Berbagi', links: [{ to: '/supply/new', label: 'Tawarkan resource' }, { to: '/requests/new', label: 'Buat request' }] },
    ...(user ? [{ title: 'Akun', links: accountLinks }] : auth.status === 'anonymous' ? [{ title: 'Akun', links: [{ to: '/login', label: 'Masuk' }, { to: '/register', label: 'Daftar' }] }] : []),
  ]
  if ((landing || authPage) && !user) {
    footerGroups[1] = { title: 'Berbagi & akun', links: footerGroups.slice(1).flatMap(group => group.links) }
    footerGroups.splice(2)
  }

  async function handleLogout() {
    if (logoutPending.current) return
    logoutPending.current = true
    setLoggingOut(true)
    setLogoutError(false)
    try {
      await logout()
      auth.clearSession()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) auth.clearSession()
      else setLogoutError(true)
    } finally {
      setLoggingOut(false)
      logoutPending.current = false
    }
  }

  useEffect(() => {
    if (navigation.state === 'idle') document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [pathname, search, auth.status, navigation.state])

  return (
    <>
      <a className="fixed -top-25 left-4 z-10 bg-surface p-3 focus:top-3" href="#main-content">Langsung ke konten</a>
      <Navbar key={`${pathname}${search}:${auth.status}`} authPage={authPage || profilePage} user={user ? { name: user.display_name || user.name || user.email || 'Akun saya' } : null} accountLinks={accountLinks} sessionStatus={auth.status} onRetrySession={() => auth.refresh()} onLogout={handleLogout} loggingOut={loggingOut} />
      <main id="main-content" className={authPage ? `flex w-full flex-col items-center justify-center bg-surface px-6 py-12 focus:outline-none nav:px-20 nav:py-16 ${pathname === '/login' ? 'min-h-[771px] nav:min-h-[685px]' : 'nav:min-h-[939px]'}` : profilePage ? 'w-full flex-1 px-6 pt-8 pb-12 focus:outline-none nav:px-16 nav:pt-10' : landing ? 'w-full flex-1 focus:outline-none' : 'mx-auto w-[calc(100%_-_2rem)] max-w-280 sm:w-[calc(100%_-_3rem)] flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16'} tabIndex={-1} aria-busy={navigation.state !== 'idle'}>
        {navigation.state !== 'idle' && <p role="status">Memuat halaman...</p>}
        {logoutError && <Alert tone="danger" title="Gagal keluar"><p>Sesi belum diakhiri. Coba lagi.</p><Button variant="secondary" onClick={handleLogout} loading={loggingOut}>Coba keluar lagi</Button></Alert>}
        <Outlet />
      </main>
      <Footer groups={footerGroups} landing={landing} />
    </>
  )
}
