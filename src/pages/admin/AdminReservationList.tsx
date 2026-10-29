import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageState from '../../components/PageState.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import ReservationCard from '../../components/transactions/ReservationCard.tsx'
import { adminReservationsApi, type AdminReservationPage } from '../../services/reservations.ts'
import { quantityText, reservationError, reservationLabel, reservationRef, sharingText } from '../reservations/model.ts'

const statusOptions = [{ value: '', label: 'Semua status' }, { value: 'PENDING', label: 'Menunggu keputusan' }, { value: 'ACCEPTED', label: 'Diterima' }, { value: 'REJECTED', label: 'Ditolak' }, { value: 'CANCELLED', label: 'Dibatalkan' }]
const sourceOptions = [{ value: '', label: 'Claim & penawaran' }, { value: 'LISTING_CLAIM', label: 'Claim listing' }, { value: 'REQUEST_OFFER', label: 'Penawaran request' }]
const idRe = /^[1-9]\d*$/

export default function AdminReservationList() {
  const [params, setParams] = useSearchParams()
  const status = statusOptions.some(option => option.value === params.get('status')) ? params.get('status')! : ''
  const sourceType = sourceOptions.some(option => option.value === params.get('source_type')) ? params.get('source_type')! : ''
  const providerId = idRe.test(params.get('provider_id') || '') ? params.get('provider_id')! : ''
  const receiverId = idRe.test(params.get('receiver_id') || '') ? params.get('receiver_id')! : ''
  const pageValue = params.get('page') || '1'
  const page = idRe.test(pageValue) && Number.isSafeInteger(Number(pageValue)) ? Number(pageValue) : 1
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: AdminReservationPage; error?: unknown }>({ key: '' })

  const query = new URLSearchParams({ page: String(page), page_size: '20' })
  if (status) query.set('status', status)
  if (sourceType) query.set('source_type', sourceType)
  if (providerId) query.set('provider_id', providerId)
  if (receiverId) query.set('receiver_id', receiverId)
  const key = query.toString()
  useEffect(() => {
    const controller = new AbortController()
    adminReservationsApi.list(Object.fromEntries(new URLSearchParams(key)), { signal: controller.signal }).then(data => {
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
  function onIdInput(name: 'provider_id' | 'receiver_id', raw: string) {
    const value = raw.trim()
    // Only apply valid positive ids; clearing removes the filter.
    if (value === '' || idRe.test(value)) update({ [name]: value })
  }
  const data = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  const pending = !data && !error
  function retry() { setResult({ key }); setAttempt(value => value + 1) }

  return <div className="supply-container flex flex-col gap-6">
    <header className="flex flex-col gap-2">
      <p className="supply-caption">ADMIN / MODERASI RESERVASI</p>
      <h1 className="supply-heading">Moderasi reservasi</h1>
      <p className="m-0 text-sm text-muted nav:text-base">Seluruh reservation lintas pengguna. Admin meninjau tanpa melewati aturan stok, deadline, atau status.</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 nav:grid-cols-4" role="group" aria-label="Filter reservasi">
      <FormField label="Status"><Select value={status} onChange={event => update({ status: event.target.value })} options={statusOptions} /></FormField>
      <FormField label="Jenis"><Select value={sourceType} onChange={event => update({ source_type: event.target.value })} options={sourceOptions} /></FormField>
      <FormField label="Provider ID"><Input inputMode="numeric" defaultValue={providerId} placeholder="Semua" onBlur={event => onIdInput('provider_id', event.target.value)} /></FormField>
      <FormField label="Receiver ID"><Input inputMode="numeric" defaultValue={receiverId} placeholder="Semua" onBlur={event => onIdInput('receiver_id', event.target.value)} /></FormField>
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
            counterpart={`${reservation.provider.display_name} → ${reservation.receiver.display_name}`}
            to={`/admin/reservations/${reservation.id}`}
            actions={<Link className="fr-button" to={`/admin/reservations/${reservation.id}`}>Tinjau</Link>}
          />)}</div>
          <nav aria-label="Halaman reservasi" className="mt-6 flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>Sebelumnya</Button><span aria-current="page">Halaman {page}</span><Button variant="secondary" disabled={!data.next} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>Berikutnya</Button></nav></>
        : <PageState title="Belum ada reservasi" action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>Reset filter</Button>}>Tidak ada reservation yang cocok dengan filter ini.</PageState>)}
    </section>
  </div>
}
