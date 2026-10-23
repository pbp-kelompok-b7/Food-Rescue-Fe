import { Outlet } from 'react-router'
import { useAuth } from './useAuth.ts'
import PageState from '../components/PageState.tsx'

export default function RequireAdmin() {
  const { user } = useAuth()
  if (!user?.is_admin && !user?.is_staff) {
    return <PageState error title="Akses ditolak">Halaman ini memerlukan akses admin.</PageState>
  }
  return <Outlet />
}
