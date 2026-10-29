import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import PickupStatus from '../../components/transactions/PickupStatus.tsx'
import TransactionFooter from '../../components/transactions/TransactionFooter.tsx'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import Dialog from '../../components/ui/Dialog.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { reservationsApi } from '../../services/reservations.ts'
import useReservation from './useReservation.ts'
import useSourceAvailability from './useSourceAvailability.ts'
import { actionError, approverOf, deadlineText, priceText, quantityText, reservationError, reservationLabel, reservationRef, sharingText, sourceKindLabel, viewerIsApprover, viewerRole } from './model.ts'

const headings: Record<string, string> = {
  ACCEPTED: 'Kesepakatan diterima', REJECTED: 'Pengajuan tidak berlanjut', CANCELLED: 'Pengajuan tidak berlanjut',
}
const pickupLabels: Record<string, string> = { SCHEDULED: 'Dijadwalkan', COMPLETED: 'Selesai diterima', NO_SHOW: 'Tidak hadir', CANCELLED: 'Dibatalkan' }

interface PickupShape { status: string; scheduled_at?: string; location?: { area?: string }; instructions?: string | null }
type DialogKind = 'reject' | 'cancel' | null

export default function ReservationDetail() {
  const { id = '' } = useParams()
  const result = useReservation(id)
  const auth = useAuth()
  const location = useLocation()
  const [busy, setBusy] = useState<'accept' | 'reject' | 'cancel' | null>(null)
  const [actionFailure, setActionFailure] = useState<string>()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const pending = useRef(false)

  // Fetch the source's current availability so the approver sees "Jumlah
  // tersedia saat ini" (Figma). Hooks run unconditionally; it only fetches when
  // enabled below. Loaded reservation is passed through once ready.
  const loaded = result.status === 'ready' ? result.data : null
  const viewerIdEarly = auth.status === 'authenticated' ? String(auth.user?.id) : null
  const needsAvailability = loaded !== null && loaded.status === 'PENDING' && viewerIsApprover(loaded, viewerIdEarly)
  const sourceAvailable = useSourceAvailability(loaded, needsAvailability)

  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat reservation…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Reservation belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/reservations">Reservasi saya</Link></>}>{reservationError(result.error)}</PageState></div>

  const reservation = result.data
  // Prefer the immutable accepted snapshot once accepted, so edits to the
  // source never change the agreed terms shown here (contract 7.4.6 / §14).
  const terms = reservation.accepted_snapshot || reservation.terms
  const viewerId = auth.status === 'authenticated' ? String(auth.user?.id) : null
  const role = viewerRole(reservation, viewerId)
  const isReceiver = role === 'receiver'
  const approver = approverOf(reservation)
  const counterpart = isReceiver ? reservation.provider : reservation.receiver
  const sourceTo = reservation.listing_id ? `/supply/${reservation.listing_id}` : reservation.request_id ? `/requests/${reservation.request_id}` : null
  const quantity = quantityText(terms.quantity)
  const sharing = sharingText(reservation)
  const pickup = reservation.pickup as PickupShape | null
  const isApprover = viewerIsApprover(reservation, viewerId)
  const isSubmitter = viewerId !== null && String(reservation.submitted_by_id) === viewerId
  const isParticipant = role !== null
  const pickupCompleted = pickup?.status === 'COMPLETED'
  const sourceWord = reservation.source_type === 'LISTING_CLAIM' ? 'claim' : 'penawaran'
  // The approver reviewing a pending submission sees the review-oriented title
  // (Figma "Tinjau claim/penawaran"); the submitter sees "Pengajuan terkirim".
  const heading = reservation.status === 'PENDING'
    ? (isApprover ? `Tinjau ${sourceWord}` : 'Pengajuan terkirim')
    : (headings[reservation.status] || 'Detail reservation')

  // After any action, reload the detail so the UI reflects the backend truth
  // (no false success). A stale/invalid 409 also reloads for reconfirmation.
  async function runAction(kind: 'accept' | 'reject' | 'cancel', body: Record<string, unknown>) {
    if (pending.current) return
    pending.current = true; setBusy(kind); setActionFailure(undefined)
    try {
      if (kind === 'accept') await reservationsApi.accept(reservation.id, body)
      else if (kind === 'reject') await reservationsApi.reject(reservation.id, body)
      else await reservationsApi.cancel(reservation.id, body)
      setDialog(null); setReason(''); setReasonError(undefined)
      result.retry() // reload the authoritative state
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { auth.clearSession(); return }
      setActionFailure(actionError(error))
      // Stale version / changed status: reload so the decision is reconfirmed.
      if (error instanceof ApiError && error.status === 409) { setDialog(null); result.retry() }
    } finally { pending.current = false; setBusy(null) }
  }
  function confirmReasonDialog() {
    const trimmed = reason.trim()
    if (!trimmed) { setReasonError('Isi alasan terlebih dahulu.'); return }
    if (trimmed.length > 1000) { setReasonError('Alasan terlalu panjang.'); return }
    setReasonError(undefined)
    if (dialog === 'reject') runAction('reject', { reason: trimmed, expected_version: reservation.version })
    else if (dialog === 'cancel') runAction('cancel', { reason: trimmed })
  }

  const summary = <AgreementSummary
    reference={`${reservationRef(reservation.id)} · ${reservationLabel(terms.resource_type)}`}
    title={terms.title}
    provider={reservation.provider.display_name}
    receiver={reservation.receiver.display_name}
    quantity={Number(quantity)}
    unit={terms.unit}
    sharingLabel={sharing}
    deadlineLabel="Batas konsumsi"
    deadline={deadlineText(terms.resource_deadline)}
    location={terms.location.area}
    condition={terms.condition}
  />

  const termsBlock = <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 nav:p-6 [&_dl]:m-0 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:m-0">
    <h2 className="m-0 text-lg font-semibold">Terms kesepakatan</h2>
    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 text-sm">
      <dt>Jumlah</dt><dd><strong>{quantity} {terms.unit}</strong></dd>
      <dt>Cara berbagi</dt><dd>{sharing}</dd>
      {terms.mode === 'SELL' && <><dt>Total harga</dt><dd>{priceText(terms.total_price)}</dd></>}
      <dt>Versi</dt><dd>v{reservation.version}</dd>
    </dl>
    {reservation.accepted_snapshot
      ? <p className="m-0 text-xs text-muted">Detail ini terkunci dari salinan kesepakatan saat diterima; perubahan sumber tidak mengubahnya.</p>
      : <p className="m-0 text-xs text-muted">Jumlah masih dapat direvisi selama PENDING. Harga mengikuti listing dan tidak dinegosiasikan.</p>}
  </section>

  // Cancel is available to any participant while PENDING or ACCEPTED (pickup not completed).
  const canCancel = isParticipant && (reservation.status === 'PENDING' || (reservation.status === 'ACCEPTED' && !pickupCompleted))

  let actions
  if (reservation.status === 'PENDING') {
    actions = <>
      {isApprover ? <>
        <h2 className="m-0 text-xl font-bold leading-normal">{counterpart.display_name} mengajukan</h2>
        <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Jumlah yang diminta</p><p className="m-0 font-semibold">{quantity} {terms.unit}</p></div>
        {sourceAvailable !== null && <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Jumlah tersedia saat ini</p><p className="m-0 font-semibold">{quantityText(sourceAvailable)} {terms.unit}</p></div>}
        <p className="m-0 text-sm text-muted">Pengajuan {deadlineText(reservation.created_at)}.</p>
        <p className="m-0 text-base text-muted">Jika diterima, {quantity} {terms.unit} dialokasikan dan kamu bisa mencatat jadwal pickup.</p>
        <Button className="w-full" loading={busy === 'accept'} disabled={busy !== null} onClick={() => runAction('accept', { expected_version: reservation.version })}>Terima {sourceWord}</Button>
        <Button className="w-full" variant="secondary" disabled={busy !== null} onClick={() => { setReason(''); setReasonError(undefined); setActionFailure(undefined); setDialog('reject') }}>Tolak {sourceWord}</Button>
        <p className="m-0 text-sm text-muted">Kontak belum tersedia sebelum pengajuan diterima.</p>
      </> : <>
        <h2 className="m-0 text-xl font-bold leading-normal">Pengajuan terkirim</h2>
        <p className="m-0 text-base text-muted">Menunggu keputusan {approver.display_name}. Jumlah belum dialokasikan dan kontak belum dibuka.</p>
        <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Jumlah diajukan</p><p className="m-0 font-semibold">{quantity} {terms.unit} · {sharing}</p></div>
        {isSubmitter && <Link className="fr-button w-full" to={`/reservations/${reservation.id}/edit`}>Ubah jumlah</Link>}
      </>}
    </>
  } else if (reservation.status === 'ACCEPTED') {
    const contact = reservation.counterparty_contact?.whatsapp_number
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">{quantity} {terms.unit} sudah dialokasikan</h2>
      <p className="m-0 text-base text-muted">Hubungi {counterpart.display_name} untuk menentukan waktu. Provider akan mencatat jadwalnya.</p>
      {contact
        ? <a className="fr-button w-full" href={`https://wa.me/${contact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">Hubungi {isReceiver ? 'provider' : 'receiver'} di WhatsApp</a>
        : <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Kontak {isReceiver ? 'provider' : 'receiver'}</p><p className="m-0 font-semibold">Belum tersedia</p></div>}
      <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">WhatsApp kamu</p><p className="m-0 font-semibold">{auth.status === 'authenticated' && auth.user?.whatsapp_number ? 'Nomor sudah terisi' : 'Belum terisi — lengkapi di profil'}</p></div>
      <p className="m-0 text-sm text-muted">Jumlah dan detail kesepakatan sudah terkunci.</p>
      {reservation.accepted_at && <p className="m-0 text-sm text-muted">Diterima {deadlineText(reservation.accepted_at)}.</p>}
    </>
  } else {
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">Pengajuan tidak berlanjut</h2>
      <p className="m-0 text-base text-muted">{reservation.status === 'REJECTED' ? 'Pengajuan ditolak.' : 'Kesepakatan dibatalkan. Alokasi resource dilepas.'} Untuk melanjutkan, buat pengajuan baru.</p>
      {reservation.reason && <p className="m-0 text-sm text-muted">Alasan: {reservation.reason}</p>}
      <Link className="fr-button w-full" to={reservation.source_type === 'LISTING_CLAIM' ? '/supply' : '/requests'}>{reservation.source_type === 'LISTING_CLAIM' ? 'Cari resource lain' : 'Lihat papan request'}</Link>
    </>
  }

  return <div className="mx-auto flex max-w-290 flex-col gap-6 px-4 py-6 nav:px-24 nav:py-10">
    <Link className="inline-flex min-h-11 items-center text-sm text-link" to="/reservations">← Reservasi saya</Link>
    {location.state?.reservationCreated && <Alert tone="success" title="Pengajuan berhasil diajukan"><p>Pengajuanmu menunggu persetujuan {approver.display_name}. Status masih PENDING: stok belum berkurang dan belum tentu disetujui.</p></Alert>}
    {location.state?.reservationRevised && <Alert tone="success" title="Jumlah diperbarui"><p>Jumlah pengajuan berhasil direvisi. {approver.display_name} akan meninjau versi terbaru.</p></Alert>}
    {/* Page-level errors only when no dialog is open; dialog errors render inside it. */}
    {actionFailure && dialog === null && <Alert tone="danger" title="Tindakan belum selesai"><p>{actionFailure}</p></Alert>}
    <header className="flex flex-col gap-3">
      <h1 className="supply-heading">{heading}</h1>
      <p className="m-0 text-base text-muted">{reservationRef(reservation.id)} · {sourceKindLabel(reservation.source_type)} · Anda {role === 'provider' ? 'provider' : role === 'receiver' ? 'receiver' : 'peserta'}</p>
      <Badge status={reservation.status}>{reservationLabel(reservation.status)}</Badge>
    </header>
    <div className="grid items-start gap-6 nav:grid-cols-2">
      <div className="order-2 flex flex-col gap-6 nav:order-1">{summary}{termsBlock}</div>
      <section className="order-1 flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:order-2 nav:p-6">
        {actions}
        {canCancel && <Button className="w-full" variant="ghost" disabled={busy !== null} onClick={() => { setReason(''); setReasonError(undefined); setActionFailure(undefined); setDialog('cancel') }}>Batalkan reservasi</Button>}
      </section>
    </div>
    {pickup && <PickupStatus status={pickup.status} label={pickupLabels[pickup.status] || pickup.status} scheduledAt={pickup.scheduled_at ? deadlineText(pickup.scheduled_at) : undefined} location={pickup.location?.area} instructions={pickup.instructions || undefined}>
      <p className="m-0 mt-2 text-xs text-muted">Pickup selesai mencatat penerimaan resource, bukan bukti pembayaran.</p>
    </PickupStatus>}
    {sourceTo && <Link className="self-start text-sm text-link" to={sourceTo}>Lihat sumber resource</Link>}
    <TransactionFooter />

    <Dialog open={dialog !== null} title={dialog === 'reject' ? `Tolak ${sourceWord}` : 'Batalkan reservasi'} onClose={busy ? undefined : () => setDialog(null)}>
      <p className="m-0 mb-3 text-sm text-muted">{dialog === 'reject'
        ? 'Pengajuan akan ditolak dan tidak dapat dilanjutkan. Jelaskan alasannya untuk riwayat.'
        : 'Reservasi akan dibatalkan. Alokasi yang diterima dilepas dan pickup terjadwal ikut dibatalkan. Sumber yang sudah ditutup/kedaluwarsa tidak dibuka kembali.'}</p>
      {actionFailure && dialog !== null && <div className="mb-3"><Alert tone="danger" title="Tindakan belum selesai"><p>{actionFailure}</p></Alert></div>}
      <form onSubmit={event => { event.preventDefault(); confirmReasonDialog() }}>
        <label className="mb-1 block text-sm font-semibold" htmlFor="reservation-reason">Alasan</label>
        <Textarea id="reservation-reason" name="reason" value={reason} onChange={event => { setReason(event.target.value); setReasonError(undefined) }} maxLength={1000} aria-invalid={Boolean(reasonError)} disabled={busy !== null} />
        {reasonError && <p className="mt-1 mb-0 text-sm text-danger">{reasonError}</p>}
        <div className="mt-4 flex gap-3 [&>button]:h-11 [&>button]:flex-1 [&>button]:py-0">
          <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => setDialog(null)}>Batal</Button>
          <Button type="submit" variant="destructive" loading={busy === 'reject' || busy === 'cancel'}>{dialog === 'reject' ? `Tolak ${sourceWord}` : 'Batalkan reservasi'}</Button>
        </div>
      </form>
    </Dialog>
  </div>
}
