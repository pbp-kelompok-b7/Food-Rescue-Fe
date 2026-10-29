import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import PickupStatus from '../../components/transactions/PickupStatus.tsx'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import Dialog from '../../components/ui/Dialog.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import { decimalError } from '../../components/resources/resourceFields.ts'
import { ApiError } from '../../services/api.ts'
import { adminReservationsApi } from '../../services/reservations.ts'
import useAdminReservation from './useAdminReservation.ts'
import { actionError, actionFieldError, approverOf, deadlineText, priceText, quantityText, reservationError, reservationLabel, reservationRef, sharingText, sourceKindLabel } from '../reservations/model.ts'

const headings: Record<string, string> = { PENDING: 'Menunggu keputusan', ACCEPTED: 'Diterima', REJECTED: 'Ditolak', CANCELLED: 'Dibatalkan' }
const pickupLabels: Record<string, string> = { SCHEDULED: 'Dijadwalkan', COMPLETED: 'Selesai diterima', NO_SHOW: 'Tidak hadir', CANCELLED: 'Dibatalkan' }
interface PickupShape { status: string; scheduled_at?: string; location?: { area?: string }; instructions?: string | null }
type Action = 'accept' | 'reject' | 'cancel'

function Contact({ label, contact }: { label: string; contact: { whatsapp_number: string | null } | null }) {
  const number = contact?.whatsapp_number
  return <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">{label}</p>{number
    ? <a className="m-0 font-semibold text-link" href={`https://wa.me/${number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">{number}</a>
    : <p className="m-0 font-semibold">Belum tersedia</p>}</div>
}

export default function AdminReservationDetail() {
  const { id = '' } = useParams()
  const result = useAdminReservation(id)
  const reference = useReferenceData()
  const auth = useAuth()
  const [busy, setBusy] = useState<Action | 'revise' | null>(null)
  const [actionFailure, setActionFailure] = useState<string>()
  const [dialog, setDialog] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [editing, setEditing] = useState(false)
  const [quantity, setQuantity] = useState<string | null>(null)
  const [quantityError, setQuantityError] = useState<string>()
  const pending = useRef(false)

  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat reservation…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Reservation belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/admin/reservations">Moderasi reservasi</Link></>}>{reservationError(result.error)}</PageState></div>

  const reservation = result.data
  const terms = reservation.accepted_snapshot || reservation.terms
  const quantityValue = quantity ?? quantityText(terms.quantity)
  const sharing = sharingText(reservation)
  const pickup = reservation.pickup as PickupShape | null
  const pickupCompleted = pickup?.status === 'COMPLETED'
  const isPending = reservation.status === 'PENDING'
  const canCancel = isPending || (reservation.status === 'ACCEPTED' && !pickupCompleted)
  const unit = reference.status === 'ready' ? reference.data.units.find(item => item.code === terms.unit) : undefined
  const step = unit && unit.allows_decimal && unit.max_decimal_places > 0 ? 10 ** -unit.max_decimal_places : 1

  async function runAction(kind: Action | 'revise', body: Record<string, unknown>) {
    if (pending.current) return
    pending.current = true; setBusy(kind); setActionFailure(undefined)
    try {
      if (kind === 'accept') await adminReservationsApi.accept(reservation.id, body)
      else if (kind === 'reject') await adminReservationsApi.reject(reservation.id, body)
      else if (kind === 'cancel') await adminReservationsApi.cancel(reservation.id, body)
      else await adminReservationsApi.revise(reservation.id, body)
      setDialog(null); setReason(''); setReasonError(undefined); setEditing(false); setQuantity(null); setQuantityError(undefined)
      result.retry() // reload the authoritative state (admin never bypasses invariants)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { auth.clearSession(); return }
      setActionFailure(actionError(error))
      if (kind === 'revise' && error instanceof ApiError) setQuantityError(actionFieldError(error))
      // Stale/changed status: reload so the moderator reconfirms against the latest.
      if (error instanceof ApiError && error.status === 409) { setDialog(null); result.retry() }
    } finally { pending.current = false; setBusy(null) }
  }
  function confirmReason() {
    const trimmed = reason.trim()
    if (!trimmed) { setReasonError('Isi alasan terlebih dahulu.'); return }
    if (trimmed.length > 1000) { setReasonError('Alasan terlalu panjang.'); return }
    setReasonError(undefined)
    if (dialog === 'accept') runAction('accept', { reason: trimmed, expected_version: reservation.version })
    else if (dialog === 'reject') runAction('reject', { reason: trimmed, expected_version: reservation.version })
    else if (dialog === 'cancel') runAction('cancel', { reason: trimmed })
  }
  function submitRevise() {
    const message = decimalError(quantityValue, unit ? (unit.allows_decimal ? unit.max_decimal_places : 0) : 0, false, 9)
    if (message) { setQuantityError(message); return }
    const trimmed = reason.trim()
    if (!trimmed) { setReasonError('Isi alasan terlebih dahulu.'); return }
    setQuantityError(undefined); setReasonError(undefined)
    runAction('revise', { quantity: quantityValue, expected_version: reservation.version, reason: trimmed })
  }
  function openDialog(kind: Action) { setReason(''); setReasonError(undefined); setActionFailure(undefined); setDialog(kind) }
  const sourceWord = reservation.source_type === 'LISTING_CLAIM' ? 'claim' : 'penawaran'

  return <div className="mx-auto flex max-w-290 flex-col gap-6 px-4 py-6 nav:px-24 nav:py-10">
    <Link className="inline-flex min-h-11 items-center text-sm text-link" to="/admin/reservations">← Moderasi reservasi</Link>
    {actionFailure && dialog === null && <Alert tone="danger" title="Tindakan belum selesai"><p>{actionFailure}</p></Alert>}
    <header className="flex flex-col gap-3">
      <h1 className="supply-heading">Moderasi {sourceWord}</h1>
      <p className="m-0 text-base text-muted">{reservationRef(reservation.id)} · {sourceKindLabel(reservation.source_type)} · {headings[reservation.status]}</p>
      <Badge status={reservation.status}>{reservationLabel(reservation.status)}</Badge>
    </header>
    <Alert tone="info" title="Moderasi admin"><p>Tindakan admin tetap tunduk pada aturan stok, deadline, dan status. Harga, pihak transaksi, dan counter tidak dapat diedit, dan status terminal tidak dapat direset.</p></Alert>
    <div className="grid items-start gap-6 nav:grid-cols-2">
      <div className="order-2 flex flex-col gap-6 nav:order-1">
        <AgreementSummary
          reference={`${reservationRef(reservation.id)} · ${reservationLabel(terms.resource_type)}`}
          title={terms.title}
          provider={reservation.provider.display_name}
          receiver={reservation.receiver.display_name}
          quantity={Number(quantityText(terms.quantity))}
          unit={terms.unit}
          sharingLabel={sharing}
          deadlineLabel="Batas konsumsi"
          deadline={deadlineText(terms.resource_deadline)}
          location={terms.location.area}
          condition={terms.condition}
        />
        <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 nav:p-6 [&_dl]:m-0 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:m-0">
          <h2 className="m-0 text-lg font-semibold">Terms &amp; kontak</h2>
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 text-sm">
            <dt>Jumlah</dt><dd><strong>{quantityText(terms.quantity)} {terms.unit}</strong></dd>
            <dt>Cara berbagi</dt><dd>{sharing}</dd>
            {terms.mode === 'SELL' && <><dt>Total harga</dt><dd>{priceText(terms.total_price)}</dd></>}
            <dt>Versi</dt><dd>v{reservation.version}</dd>
            <dt>Diajukan oleh</dt><dd>{String(reservation.submitted_by_id) === String(reservation.provider.id) ? reservation.provider.display_name : reservation.receiver.display_name}</dd>
          </dl>
          {/* Both parties' contacts are admin-only (contract 7.4.10). */}
          <div className="grid gap-3 sm:grid-cols-2"><Contact label="Kontak provider" contact={reservation.provider_contact} /><Contact label="Kontak receiver" contact={reservation.receiver_contact} /></div>
          {reservation.accepted_snapshot && <p className="m-0 text-xs text-muted">Terms terkunci dari salinan kesepakatan saat diterima.</p>}
          {reservation.reason && <p className="m-0 text-sm text-muted">Alasan terakhir: {reservation.reason}</p>}
        </section>
      </div>
      <section className="order-1 flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:order-2 nav:p-6">
        <h2 className="m-0 text-xl font-bold leading-normal">Tindakan moderasi</h2>
        {isPending ? <>
          <p className="m-0 text-base text-muted">{approverOf(reservation).display_name} adalah penyetuju. Admin dapat memutuskan atas nama mereka dengan alasan audit.</p>
          {editing
            ? <div className="flex flex-col gap-3 rounded-md bg-supply-container p-3">
                <FormField label={`Jumlah baru (${terms.unit})`} error={quantityError}><Input name="quantity" inputMode="decimal" type="number" min={step} step={step} value={quantityValue} disabled={busy !== null} onChange={event => { setQuantity(event.target.value); setQuantityError(undefined) }} /></FormField>
                <FormField label="Alasan" error={reasonError}><Textarea name="reason" value={reason} onChange={event => { setReason(event.target.value); setReasonError(undefined) }} maxLength={1000} /></FormField>
                <div className="flex gap-3 [&>button]:flex-1"><Button variant="secondary" disabled={busy !== null} onClick={() => { setEditing(false); setQuantity(null); setReason(''); setReasonError(undefined); setQuantityError(undefined) }}>Batal</Button><Button loading={busy === 'revise'} onClick={submitRevise}>Simpan jumlah</Button></div>
              </div>
            : <Button variant="secondary" disabled={busy !== null} onClick={() => { setReason(''); setReasonError(undefined); setActionFailure(undefined); setQuantity(null); setEditing(true) }}>Ubah jumlah</Button>}
          <Button className="w-full" disabled={busy !== null || editing} onClick={() => openDialog('accept')}>Terima {sourceWord}</Button>
          <Button className="w-full" variant="secondary" disabled={busy !== null || editing} onClick={() => openDialog('reject')}>Tolak {sourceWord}</Button>
        </> : <p className="m-0 text-base text-muted">Reservation {reservationLabel(reservation.status).toLowerCase()}. {reservation.accepted_at ? `Diterima ${deadlineText(reservation.accepted_at)}.` : ''}</p>}
        {canCancel && <Button className="w-full" variant="ghost" disabled={busy !== null || editing} onClick={() => openDialog('cancel')}>Batalkan reservasi</Button>}
      </section>
    </div>
    {pickup && <PickupStatus status={pickup.status} label={pickupLabels[pickup.status] || pickup.status} scheduledAt={pickup.scheduled_at ? deadlineText(pickup.scheduled_at) : undefined} location={pickup.location?.area} instructions={pickup.instructions || undefined}>
      <p className="m-0 mt-2 text-xs text-muted">Pickup selesai mencatat penerimaan resource, bukan bukti pembayaran.</p>
    </PickupStatus>}

    <Dialog open={dialog !== null} title={dialog === 'accept' ? `Terima ${sourceWord}` : dialog === 'reject' ? `Tolak ${sourceWord}` : 'Batalkan reservasi'} onClose={busy ? undefined : () => setDialog(null)}>
      <p className="m-0 mb-3 text-sm text-muted">{dialog === 'accept'
        ? 'Menerima akan mengalokasikan jumlah dan mengunci kesepakatan. Jelaskan alasan moderasi untuk audit.'
        : dialog === 'reject'
          ? 'Pengajuan akan ditolak dan tidak dapat dilanjutkan. Jelaskan alasan moderasi untuk audit.'
          : 'Reservasi akan dibatalkan; alokasi dilepas dan pickup terjadwal ikut dibatalkan. Jelaskan alasan moderasi untuk audit.'}</p>
      {actionFailure && dialog !== null && <div className="mb-3"><Alert tone="danger" title="Tindakan belum selesai"><p>{actionFailure}</p></Alert></div>}
      <form onSubmit={event => { event.preventDefault(); confirmReason() }}>
        <label className="mb-1 block text-sm font-semibold" htmlFor="admin-reason">Alasan</label>
        <Textarea id="admin-reason" name="reason" value={reason} onChange={event => { setReason(event.target.value); setReasonError(undefined) }} maxLength={1000} aria-invalid={Boolean(reasonError)} disabled={busy !== null} />
        {reasonError && <p className="mt-1 mb-0 text-sm text-danger">{reasonError}</p>}
        <div className="mt-4 flex gap-3 [&>button]:h-11 [&>button]:flex-1 [&>button]:py-0">
          <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => setDialog(null)}>Batal</Button>
          <Button type="submit" variant={dialog === 'accept' ? 'primary' : 'destructive'} loading={busy === dialog}>{dialog === 'accept' ? `Terima ${sourceWord}` : dialog === 'reject' ? `Tolak ${sourceWord}` : 'Batalkan'}</Button>
        </div>
      </form>
    </Dialog>
  </div>
}
