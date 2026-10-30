import LocationMap from '../../components/location/LocationMap.tsx'
import { photoUrl } from '../../services/photos.ts'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { listingsApi, type Listing } from '../../services/listings.ts'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import Alert from '../../components/ui/Alert.tsx'
import { claimable, deadlineText, priceText, quantityText, supplyError, supplyLabel } from './model.ts'
import useListing from './useListing.ts'

export default function SupplyDetail() {
  const { id = '' } = useParams()
  const result = useListing(id)
  const auth = useAuth()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat supply…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Supply belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/supply">Cari resource</Link></>}>{supplyError(result.error)}</PageState></div>
  const listing = result.data
  const owner = auth.status === 'authenticated' && String(auth.user?.id) === String(listing.owner.id)
  const canEdit = owner || (auth.status === 'authenticated' && auth.user?.is_admin)
  const available = claimable(listing, now)
  const expired = Date.parse(listing.available_until) <= now && listing.status === 'AVAILABLE'
  const claimTo = `/supply/${listing.id}/claim`
  const claimAction = owner ? <p className="m-0 text-sm text-muted">Ini adalah supply milikmu.</p> : !available ? <Button className="w-full" disabled>Supply tidak tersedia</Button> : auth.status === 'error' ? <Button className="w-full" variant="secondary" onClick={() => auth.refresh()}>Periksa sesi lagi</Button> : auth.status === 'loading' ? <Button className="w-full" disabled>Memeriksa sesi…</Button> : <Link className="fr-button w-full" to={auth.status === 'anonymous' ? '/login' : claimTo} state={auth.status === 'anonymous' ? { from: claimTo } : undefined}>Ajukan permintaan</Link>
  return <article className="supply-container wrap-anywhere nav:px-16 nav:pt-4">
    {notice && <Alert tone="success" title={notice} />}
    {location.state?.supplySaved && <Alert tone="success" title={location.state.supplySaved === 'created' ? 'Supply berhasil diterbitkan.' : 'Perubahan supply berhasil disimpan.'} />}
    {owner && <Link className="mb-4 inline-flex min-h-11 items-center" to="/my/supply">Supply saya</Link>}
    <Link className="mb-6 inline-flex min-h-11 items-center text-sm" to="/supply">← Kembali</Link>
    <header className="mb-6 flex flex-col gap-3"><p className="supply-caption">SUPPLY / DETAIL</p><h1 className="supply-heading">{listing.title}</h1><div className="flex flex-wrap gap-2"><Badge tone="success">{supplyLabel(listing.mode)}</Badge><Badge status={expired ? 'EXPIRED' : listing.status}>{supplyLabel(expired ? 'EXPIRED' : listing.status)}</Badge>{listing.archived_at && <Badge>Diarsipkan</Badge>}</div></header>
    <div className="grid items-start gap-8 nav:grid-cols-[minmax(0,1.48fr)_minmax(0,1fr)] nav:gap-11">
      <div className="flex min-w-0 flex-col gap-6 nav:gap-8">
        {listing.image ? <img src={photoUrl(listing.image)} alt="Foto resource" className="max-h-110 w-full rounded-xl object-contain bg-supply-container" /> : <div className="flex min-h-65 flex-col rounded-xl bg-supply-container p-6 nav:min-h-97.5"><h2 className="m-0 font-brand text-xl font-semibold text-primary nav:text-[28px]">{listing.title}</h2><div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-surface nav:size-18"><img src="/assets/figma/supply-image.svg" className="size-8" alt="" /></span><div><p className="m-0 text-lg font-semibold">Belum ada foto</p><p className="mt-1 mb-0 text-sm text-muted">Pemilik belum menambahkan foto untuk resource ini.</p></div></div></div>}
        <LocationMap location={listing.location} />
        <div><p className="mb-1 text-[22px] font-semibold">{quantityText(listing.quantity_available)} {listing.unit} tersedia</p><p className="m-0 text-sm text-muted">{listing.mode === 'SELL' ? `${priceText(listing.unit_price)} / ${listing.unit}` : 'Siap dibagikan'}</p></div>
        <div className="nav:hidden">{claimAction}</div>
        <div className="rounded-md bg-supply-container p-4 nav:hidden"><p className="m-0 text-sm">{listing.condition}</p></div>
        <section><h2 className="text-lg font-semibold">Tentang resource</h2><p className="m-0 whitespace-pre-wrap text-sm leading-6 text-muted">{listing.description}</p></section>
        <section className="flex flex-col gap-3"><h2 className="m-0 text-lg font-semibold">Kondisi & informasi</h2><p className="m-0 hidden whitespace-pre-wrap text-sm nav:block">{listing.condition}</p><dl className="m-0 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 text-sm"><dt className="text-muted">Batas pickup / konsumsi</dt><dd className="m-0">{deadlineText(listing.available_until)}</dd>{listing.storage_notes && <><dt className="text-muted">Penyimpanan</dt><dd className="m-0 whitespace-pre-wrap">{listing.storage_notes}</dd></>}{listing.packaging_status && <><dt className="text-muted">Kemasan</dt><dd className="m-0 whitespace-pre-wrap">{listing.packaging_status}</dd></>}{listing.allergen_notes && <><dt className="text-muted">Alergen</dt><dd className="m-0 whitespace-pre-wrap">{listing.allergen_notes}</dd></>}<dt className="text-muted">Pemilik</dt><dd className="m-0">{listing.owner.display_name}</dd></dl><div className="flex flex-wrap gap-2">{listing.suitability.map(value => <Badge key={value} tone="success">{supplyLabel(value)}</Badge>)}</div></section>
        <section className="nav:hidden"><h2 className="text-lg font-semibold">Lokasi pickup</h2><p className="m-0 text-sm">{listing.location.area}</p></section>
        {canEdit && <section className="rounded-xl border border-border bg-surface p-5" aria-label="Kelola supply">
          <h2 className="text-lg font-semibold">Kelola supply</h2>
          <dl className="mb-4 grid grid-cols-2 gap-2 text-sm"><dt>Total</dt><dd>{quantityText(listing.quantity_total)} {listing.unit}</dd><dt>Dialokasikan</dt><dd>{quantityText(listing.quantity_allocated)} {listing.unit}</dd><dt>Selesai diambil</dt><dd>{quantityText(listing.quantity_completed)} {listing.unit}</dd></dl>
          <SupplyActions listing={listing} onChanged={(message, updated) => { setNotice(message); if (updated) result.update(updated); result.refresh() }} />
        </section>}
      </div>
      <aside className="hidden flex-col gap-5 rounded-xl bg-surface p-7 nav:flex"><h2 className="m-0 font-brand text-[22px] font-semibold">Ajukan permintaan</h2><p className="m-0 text-sm text-muted">Pastikan jadwal pickup sesuai sebelum mengajukan.</p><div className="rounded-md bg-supply-container p-4"><h3 className="mb-1 font-semibold">Informasi kondisi resource</h3><p className="m-0 whitespace-pre-wrap text-sm">{listing.condition}</p></div><div><h3 className="mb-2 text-sm font-semibold">Lokasi pickup</h3><p className="m-0">{listing.location.area}</p></div>{listing.mode === 'SELL' && <p className="m-0 font-semibold">{priceText(listing.unit_price)} / {listing.unit}</p>}{claimAction}<p className="m-0 text-xs text-muted">Tidak ada pembayaran di platform.</p></aside>
    </div>
  </article>
}


export function SupplyActions({ listing, onChanged }: { listing: Listing; onChanged: (message: string, updated?: Listing) => void }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [action, setAction] = useState<'close' | 'delete' | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [error, setError] = useState<unknown>()
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const canManage = auth.status === 'authenticated' && (String(auth.user?.id) === String(listing.owner.id) || auth.user?.is_admin)
  const canClose = !listing.archived_at && ['AVAILABLE', 'RESERVED'].includes(listing.status)
    && Date.parse(listing.available_until) > now && Number(listing.quantity_completed) < Number(listing.quantity_total)
  if (!canManage) return null
  function open(next: 'close' | 'delete') { setAction(next); setReason(''); setReasonError(''); setError(undefined) }
  async function confirm() {
    if (!action || inFlight.current) return
    const trimmed = reason.trim()
    if (action === 'close' && (!trimmed || trimmed.length > 1000)) { setReasonError('Isi alasan penutupan 1-1000 karakter.'); return }
    inFlight.current = true; setPending(true); setError(undefined); setReasonError('')
    try {
      if (action === 'close') {
        const updated = await listingsApi.close(listing.id, { reason: trimmed })
        setAction(null)
        onChanged('Supply berhasil ditutup. Reservasi yang sudah diterima tetap berjalan.', updated)
      } else {
        await listingsApi.remove(listing.id)
        setAction(null)
        // DELETE returns no record: the server decides hard-delete vs archive.
        // Reload owner history rather than guessing from quantity counters.
        navigate('/my/supply', { replace: true, state: { supplyRemoved: listing.id } })
        onChanged('Supply berhasil dihapus atau diarsipkan sesuai riwayat transaksi.')
      }
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        auth.clearSession()
        navigate('/login', { replace: true, state: { from: '/my/supply' } })
      } else {
        setError(failure)
        if (action === 'close' && failure instanceof ApiError && failure.status === 400) {
          setReasonError(failure.errors.filter(item => item.field === 'reason').map(item => item.message).join(' '))
        }
        if (failure instanceof ApiError && [403, 404, 409].includes(failure.status)) onChanged('')
      }
    } finally { inFlight.current = false; setPending(false) }
  }
  return <>
    {listing.archived_at ? <p className="m-0 text-sm text-muted">Supply diarsipkan. Detail dan riwayat transaksi tetap dapat dibuka.</p> : <div className="flex flex-wrap gap-2">
      <Link className="fr-button" to={`/supply/${listing.id}/edit`}>Edit supply</Link>
      <Button variant="secondary" disabled={!canClose || pending} onClick={() => open('close')}>Tutup supply</Button>
      <Button variant="destructive" disabled={pending} onClick={() => open('delete')}>Hapus supply</Button>
    </div>}
    {action && <ConfirmDialog open title={action === 'close' ? 'Tutup supply ini?' : 'Hapus atau arsipkan supply?'} onCancel={() => setAction(null)} onConfirm={() => { void confirm() }} confirmLabel={action === 'close' ? 'Ya, tutup supply' : 'Ya, hapus atau arsipkan'} destructive loading={pending}>
      <p className="mt-0 font-semibold text-ink">{listing.title}</p>
      {action === 'close' ? <><p>Pengajuan baru akan dihentikan dan pengajuan pending dibatalkan. Reservasi yang sudah diterima tetap berjalan; alokasinya tidak dilepas.</p><FormField label="Alasan penutupan" error={reasonError}><Textarea name="close_reason" value={reason} maxLength={1000} onChange={event => { setReason(event.target.value); setReasonError('') }} disabled={pending} /></FormField></> : <><p>Supply yang belum pernah memiliki transaksi akan dihapus permanen. Jika pernah memiliki transaksi, termasuk yang ditolak atau dibatalkan, supply akan diarsipkan dan historinya tetap dapat dibuka.</p><p>Pengajuan pending dibatalkan. Reservasi yang sudah diterima dan jadwal pickup tetap berjalan.</p></>}
      {error !== undefined && <Alert tone="danger" title="Perubahan belum dapat dikonfirmasi"><p className="m-0">{supplyError(error)}</p><Link className="inline-flex min-h-11 items-center" to={`/supply/${listing.id}`} target="_blank" rel="noopener noreferrer">Periksa detail terbaru</Link></Alert>}
    </ConfirmDialog>}
  </>
}
