import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import PickupStatus from '../../components/transactions/PickupStatus.tsx'
import TransactionFooter from '../../components/transactions/TransactionFooter.tsx'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import useReservation from './useReservation.ts'
import { approverOf, deadlineText, priceText, quantityText, reservationError, reservationLabel, reservationRef, sharingText, sourceKindLabel, viewerRole } from './model.ts'

const headings: Record<string, string> = {
  PENDING: 'Pengajuan terkirim', ACCEPTED: 'Kesepakatan diterima', REJECTED: 'Pengajuan tidak berlanjut', CANCELLED: 'Pengajuan tidak berlanjut',
}
const pickupLabels: Record<string, string> = { SCHEDULED: 'Dijadwalkan', COMPLETED: 'Selesai diterima', NO_SHOW: 'Tidak hadir', CANCELLED: 'Dibatalkan' }

interface PickupShape { status: string; scheduled_at?: string; location?: { area?: string }; instructions?: string | null }

export default function ReservationDetail() {
  const { id = '' } = useParams()
  const result = useReservation(id)
  const auth = useAuth()
  const location = useLocation()
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

  // Agreed-terms block (quantity, unit, total price, version, snapshot note).
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

  let actions
  if (reservation.status === 'PENDING') {
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">Pengajuan terkirim</h2>
      <p className="m-0 text-base text-muted">Menunggu keputusan {approver.display_name}. Jumlah belum dialokasikan dan kontak belum dibuka.</p>
      <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Jumlah diajukan</p><p className="m-0 font-semibold">{quantity} {terms.unit} · {sharing}</p></div>
      {/* Only the submitter may revise the pending quantity (contract 7.4.5). */}
      {viewerId !== null && String(reservation.submitted_by_id) === viewerId && <Link className="fr-button w-full" to={`/reservations/${reservation.id}/edit`}>Ubah jumlah</Link>}
    </>
  } else if (reservation.status === 'ACCEPTED') {
    const contact = reservation.counterparty_contact?.whatsapp_number
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">{quantity} {terms.unit} sudah dialokasikan</h2>
      <p className="m-0 text-base text-muted">Hubungi {counterpart.display_name} untuk menentukan waktu. Provider akan mencatat jadwalnya.</p>
      {/* Contact only appears when the backend reveals it (ACCEPTED + number filled). */}
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
    <header className="flex flex-col gap-3">
      <h1 className="supply-heading">{headings[reservation.status] || 'Detail reservation'}</h1>
      <p className="m-0 text-base text-muted">{reservationRef(reservation.id)} · {sourceKindLabel(reservation.source_type)} · Anda {role === 'provider' ? 'provider' : role === 'receiver' ? 'receiver' : 'peserta'}</p>
      <Badge status={reservation.status}>{reservationLabel(reservation.status)}</Badge>
    </header>
    <div className="grid items-start gap-6 nav:grid-cols-2">
      <div className="order-2 flex flex-col gap-6 nav:order-1">{summary}{termsBlock}</div>
      <section className="order-1 flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:order-2 nav:p-6">{actions}</section>
    </div>
    {/* Pickup relationship: at most one pickup; reservation stays ACCEPTED after completion. */}
    {pickup && <PickupStatus status={pickup.status} label={pickupLabels[pickup.status] || pickup.status} scheduledAt={pickup.scheduled_at ? deadlineText(pickup.scheduled_at) : undefined} location={pickup.location?.area} instructions={pickup.instructions || undefined}>
      <p className="m-0 mt-2 text-xs text-muted">Pickup selesai mencatat penerimaan resource, bukan bukti pembayaran.</p>
    </PickupStatus>}
    {sourceTo && <Link className="self-start text-sm text-link" to={sourceTo}>Lihat sumber resource</Link>}
    <TransactionFooter />
  </div>
}
