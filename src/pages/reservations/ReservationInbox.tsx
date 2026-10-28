import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Select from '../../components/ui/Select.tsx'
import ReservationCard from '../../components/transactions/ReservationCard.tsx'
import { reservationsApi, type ReservationPage } from '../../services/reservations.ts'
import { actionLabel, followUpText, quantityText, reservationError, reservationLabel, reservationRef, sharingText } from './model.ts'

const roleOptions = [{ value: '', label: 'Semua peran' }, { value: 'provider', label: 'Sebagai provider' }, { value: 'receiver', label: 'Sebagai receiver' }]
const statusOptions = [{ value: '', label: 'Semua status' }, { value: 'PENDING', label: 'Menunggu persetujuan' }, { value: 'ACCEPTED', label: 'Diterima' }, { value: 'REJECTED', label: 'Ditolak' }, { value: 'CANCELLED', label: 'Dibatalkan' }]
const sourceOptions = [{ value: '', label: 'Claim & penawaran' }, { value: 'LISTING_CLAIM', label: 'Claim listing' }, { value: 'REQUEST_OFFER', label: 'Penawaran request' }]

export default function ReservationInbox() {
  const [params, setParams] = useSearchParams()
  const auth = useAuth()
  const viewerId = auth.status === 'authenticated' ? String(auth.user?.id) : null
  // Deep-linkable filters; unknown values are ignored (treated as "all").
  const role = roleOptions.some(option => option.value === params.get('role')) ? params.get('role')! : ''
  const status = statusOptions.some(option => option.value === params.get('status')) ? params.get('status')! : ''
  const sourceType = sourceOptions.some(option => option.value === params.get('source_type')) ? params.get('source_type')! : ''
  const pageValue = params.get('page') || '1'
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) ? Number(pageValue) : 1
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: ReservationPage; error?: unknown }>({ key: '' })

  const query = new URLSearchParams({ page: String(page), page_size: '20' })
  if (role) query.set('role', role)
  if (status) query.set('status', status)
  if (sourceType) query.set('source_type', sourceType)
  const key = query.toString()
  useEffect(() => {
    const controller = new AbortController()
    reservationsApi.list(Object.fromEntries(new URLSearchParams(key)), { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ key, data })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, error })
    })
    return () => controller.abort()
  }, [key, attempt])

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    next.delete('page')
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name))
    setParams(next)
  }
  const data = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  const pending = !data && !error
  function retry() { setResult({ key }); setAttempt(value => value + 1) }

  return <div className="supply-container flex flex-col gap-6">
    <header className="flex flex-col gap-2">
      <p className="supply-caption">MATCH / RESERVASI</p>
      <h1 className="supply-heading">Reservasi saya</h1>
      <p className="m-0 text-sm text-muted nav:text-base">Semua claim dan penawaran yang kamu ikuti sebagai provider maupun receiver.</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Filter reservasi">
      <FormField label="Peran"><Select value={role} onChange={event => update({ role: event.target.value })} options={roleOptions} /></FormField>
      <FormField label="Status"><Select value={status} onChange={event => update({ status: event.target.value })} options={statusOptions} /></FormField>
      <FormField label="Jenis"><Select value={sourceType} onChange={event => update({ source_type: event.target.value })} options={sourceOptions} /></FormField>
    </div>
    <section aria-label="Daftar reservasi" aria-busy={pending} className="min-w-0">
      <p className="mb-4 m-0 text-xs text-muted">{data ? `${data.count} reservation` : 'Memuat reservasi…'}</p>
      {pending && <p role="status">Memuat reservasi…</p>}
      {error !== undefined && <PageState error title="Reservasi belum dapat dimuat" action={<Button onClick={retry}>Coba lagi</Button>}>{reservationError(error)}</PageState>}
      {data && (data.results.length
        ? <><div className="grid items-start gap-4 xl:grid-cols-2">{data.results.map(reservation => <ReservationCard
            key={reservation.id}
            reference={`${reservationRef(reservation.id)} · ${reservationLabel(reservation.source_type)}`}
            title={reservation.terms.title}
            status={reservation.status}
            quantity={Number(quantityText(reservation.terms.quantity))}
            unit={`${reservation.terms.unit} · ${sharingText(reservation)}`}
            counterpart={followUpText(reservation, viewerId)}
            to={`/reservations/${reservation.id}`}
            actions={<Link className="fr-button" to={`/reservations/${reservation.id}`}>{actionLabel(reservation, viewerId)}</Link>}
          />)}</div>
          <nav aria-label="Halaman reservasi" className="mt-6 flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>Sebelumnya</Button><span aria-current="page">Halaman {page}</span><Button variant="secondary" disabled={!data.next} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>Berikutnya</Button></nav></>
        : <PageState title="Belum ada reservasi" action={<><Link className="fr-button" to="/supply">Cari resource</Link><Link className="fr-button ml-3 not-disabled:border not-disabled:border-outline not-disabled:bg-surface not-disabled:text-ink not-disabled:shadow-none" to="/requests">Papan request</Link></>}>Ajukan claim pada supply atau tawarkan resource pada request untuk memulai.</PageState>)}
    </section>
  </div>
}
