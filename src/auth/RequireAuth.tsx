import { Navigate, Outlet, useLocation } from 'react-router'
import { useMemo } from 'react'
import { useAuth } from './useAuth.ts'
import PageState from '../components/PageState.tsx'
import Button from '../components/ui/Button.tsx'
import { errorCopy } from '../services/errors.ts'
import { ApiError } from '../services/api.ts'

export { default as ErrorBoundary } from '../components/RouteError.tsx'

export default function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  // Keep Navigate's effect stable while the lazy login route is still loading.
  const redirectState = useMemo(() => ({ from: location.pathname + location.search + location.hash }), [location.pathname, location.search, location.hash])
  if (auth.status === 'loading') return <div role="status"><PageState title="Memeriksa sesi">Tunggu sebentar.</PageState></div>
  if (auth.status === 'error') {
    const copy = errorCopy(auth.error instanceof ApiError ? auth.error.status : undefined)
    return <PageState error title="Sesi belum dapat diperiksa" action={<Button onClick={() => auth.refresh()}>Coba lagi</Button>}>{copy.message}</PageState>
  }
  if (auth.status !== 'authenticated') return <Navigate to="/login" replace state={redirectState} />
  return <Outlet />
}
