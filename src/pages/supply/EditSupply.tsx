import { Link, useParams } from 'react-router'
import { useEffect } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Button from '../../components/ui/Button.tsx'
import SupplyForm from './SupplyForm.tsx'
import { supplyError } from './model.ts'
import useListing from './useListing.ts'
import { ApiError } from '../../services/api.ts'

export default function EditSupply() {
  const { id = '' } = useParams()
  const listing = useListing(id)
  const auth = useAuth()
  const { clearSession, status } = auth
  const failure = listing.status === 'error' ? listing.error : undefined
  useEffect(() => {
    if (status === 'authenticated' && failure instanceof ApiError && failure.status === 401) clearSession()
  }, [failure, status, clearSession])
  if (listing.status === 'loading') return <div className="supply-container" role="status">Memuat supply…</div>
  if (listing.status === 'error') return <div className="supply-container"><PageState error title="Supply belum dapat diedit" action={<Button onClick={listing.retry}>Coba lagi</Button>}>{supplyError(listing.error)}</PageState></div>
  if (auth.status !== 'authenticated' || (!auth.user?.is_admin && String(auth.user?.id) !== String(listing.data.owner.id))) return <div className="supply-container"><PageState error title="Akses ditolak" action={<Link to={`/supply/${id}`}>Kembali ke detail</Link>}>Hanya pemilik supply atau admin yang dapat mengedit resource ini.</PageState></div>
  return <SupplyForm key={`${listing.data.id}:${listing.data.updated_at}`} initial={listing.data} />
}
