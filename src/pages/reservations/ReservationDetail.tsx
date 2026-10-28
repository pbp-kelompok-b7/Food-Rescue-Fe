import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import TransactionFooter from '../../components/transactions/TransactionFooter.tsx'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import useReservation from './useReservation.ts'
import { deadlineText, priceText, quantityText, reservationError, reservationLabel } from './model.ts'

const headings: Record<string, string> = {
  PENDING: 'Pengajuan terkirim', ACCEPTED: 'Kesepakatan diterima', REJECTED: 'Pengajuan tidak berlanjut', CANCELLED: 'Pengajuan tidak berlanjut',
}

export default function ReservationDetail() {
  const { id = '' } = useParams()
  const result = useReservation(id)
  const auth = useAuth()
  const location = useLocation()
  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat reservation…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Reservation belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/reservations">Reservasi saya</Link></>}>{reservationError(result.error)}</PageState></div>

  const reservation = result.data
  const terms = reservation.terms
  const viewerId = auth.status === 'authenticated' ? String(auth.user?.id) : null
  const isReceiver = viewerId === String(reservation.receiver.id)
  const approver = reservation.source_type === 'LISTING_CLAIM' ? reservation.provider : reservation.receiver
  const counterpart = isReceiver ? reservation.provider : reservation.receiver
  const sourceTo = reservation.listing_id ? `/supply/${reservation.listing_id}` : reservation.request_id ? `/requests/${reservation.request_id}` : null
  const sourceKind = reservation.source_type === 'LISTING_CLAIM' ? 'Claim listing' : 'Penawaran request'
  const quantity = quantityText(terms.quantity)
  const sharingLabel = terms.mode === 'SELL' ? `${reservationLabel('SELL')} · ${priceText(terms.unit_price)} / ${terms.unit}` : reservationLabel('DONATE')

  const summary = <AgreementSummary
    reference={reservationLabel(terms.resource_type)}
    title={terms.title}
    provider={reservation.provider.display_name}
    receiver={reservation.receiver.display_name}
    quantity={Number(quantity)}
    unit={terms.unit}
    sharingLabel={sharingLabel}
    deadlineLabel="Batas konsumsi"
    deadline={deadlineText(terms.resource_deadline)}
    location={terms.location.area}
    condition={terms.condition}
  />

  let actions
  if (reservation.status === 'PENDING') {
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">Pengajuan terkirim</h2>
      <p className="m-0 text-base text-muted">Menunggu keputusan {approver.display_name}. Jumlah belum dialokasikan dan kontak belum dibuka.</p>
      <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Jumlah diajukan</p><p className="m-0 font-bold">{quantity} {terms.unit} · {sharingLabel}</p></div>
      {isReceiver && <Link className="fr-button w-full" to={`/reservations/${reservation.id}/edit`}>Ubah jumlah</Link>}
    </>
  } else if (reservation.status === 'ACCEPTED') {
    const contact = reservation.counterparty_contact?.whatsapp_number
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">{quantity} {terms.unit} sudah dialokasikan</h2>
      <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Status pickup</p><p className="m-0 font-bold">{reservation.pickup ? 'Sudah dijadwalkan' : 'Belum dijadwalkan'}</p></div>
      <p className="m-0 text-base text-muted">Hubungi {counterpart.display_name} untuk menentukan waktu. Provider akan mencatat jadwalnya.</p>
      {contact ? <a className="fr-button w-full" href={`https://wa.me/${contact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">Hubungi {isReceiver ? 'provider' : 'receiver'}</a> : <Button className="w-full" disabled>Kontak belum tersedia</Button>}
      <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">WhatsApp kamu</p><p className="m-0 font-bold">{auth.status === 'authenticated' && auth.user?.whatsapp_number ? 'Nomor sudah terisi' : 'Lengkapi di profil'}</p></div>
      <p className="m-0 text-sm text-muted">Jumlah dan detail kesepakatan sudah terkunci.</p>
      {reservation.accepted_at && <p className="m-0 text-sm text-muted">Diterima {deadlineText(reservation.accepted_at)}.</p>}
    </>
  } else {
    actions = <>
      <h2 className="m-0 text-xl font-bold leading-normal">Pengajuan tidak berlanjut</h2>
      <p className="m-0 text-base text-muted">{reservation.status === 'REJECTED' ? 'Pengajuan ditolak provider.' : 'Kesepakatan dibatalkan. Alokasi resource dilepas.'} Untuk melanjutkan, buat pengajuan baru.</p>
      {reservation.reason && <p className="m-0 text-sm text-muted">Alasan: {reservation.reason}</p>}
      <Link className="fr-button w-full" to="/supply">Cari resource lain</Link>
    </>
  }

  return <div className="mx-auto flex max-w-290 flex-col gap-6 px-4 py-6 nav:px-24 nav:py-10">
    <Link className="inline-flex min-h-11 items-center text-sm text-link" to="/reservations">← Reservasi saya</Link>
    {location.state?.reservationCreated && <Alert tone="success" title="Claim berhasil diajukan"><p>Pengajuanmu menunggu persetujuan {approver.display_name}. Status masih PENDING: stok belum berkurang dan belum tentu disetujui.</p></Alert>}
    <header className="flex flex-col gap-3">
      <h1 className="supply-heading">{headings[reservation.status] || 'Detail reservation'}</h1>
      <p className="m-0 text-base text-muted">{sourceKind} · Anda {isReceiver ? 'receiver' : 'provider'}</p>
      <Badge status={reservation.status}>{reservationLabel(reservation.status)}</Badge>
    </header>
    <div className="grid items-start gap-6 nav:grid-cols-2">
      <div className="order-2 nav:order-1">{summary}</div>
      <section className="order-1 flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:order-2 nav:p-6">{actions}</section>
    </div>
    {sourceTo && <Link className="self-start text-sm text-link" to={sourceTo}>Lihat sumber resource</Link>}
    <TransactionFooter />
  </div>
}
