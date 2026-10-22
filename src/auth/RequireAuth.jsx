import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth.js'
import PageState from '../components/PageState.jsx'

export default function RequireAuth({ admin = false }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <PageState title="Memeriksa sesi">Tunggu sebentar.</PageState>
  if (auth.status === 'error') return <PageState error title="Sesi belum dapat diperiksa" action={<button onClick={() => auth.refresh()}>Coba lagi</button>}>Layanan akun belum tersedia.</PageState>
  if (auth.status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (admin && !auth.user?.is_admin && !auth.user?.is_staff) return <PageState error title="Akses ditolak">Halaman ini memerlukan akses admin.</PageState>
  return <Outlet />
}
