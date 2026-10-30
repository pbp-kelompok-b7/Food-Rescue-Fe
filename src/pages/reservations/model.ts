import { ApiError } from '../../services/api.ts'
import type { Reservation } from '../../services/reservations.ts'
import { deadlineText, makeLabeller, priceText, quantityText } from '../../services/format.ts'

export { deadlineText, priceText, quantityText }
export const reservationLabel = makeLabeller({
  PENDING: 'Menunggu keputusan', ACCEPTED: 'Diterima', REJECTED: 'Ditolak', CANCELLED: 'Dibatalkan',
  LISTING_CLAIM: 'Claim listing', REQUEST_OFFER: 'Penawaran request',
})

export const reservationRef = (id: number | string) => `RSV-${String(id).padStart(3, '0')}`
export const sourceKindLabel = (sourceType: string) => (sourceType === 'LISTING_CLAIM' ? 'Claim listing' : 'Penawaran request')

// The viewer's role in a reservation, from the authenticated user id.
export function viewerRole(reservation: Reservation, viewerId: string | null): 'provider' | 'receiver' | null {
  if (viewerId === null) return null
  if (viewerId === String(reservation.provider.id)) return 'provider'
  if (viewerId === String(reservation.receiver.id)) return 'receiver'
  return null
}

// The party who decides this reservation: provider approves claims, receiver
// approves offers (contract 7.4.6).
export const approverOf = (reservation: Reservation) => (reservation.source_type === 'LISTING_CLAIM' ? reservation.provider : reservation.receiver)

export function sharingText(reservation: Reservation): string {
  const terms = reservation.terms
  return terms.mode === 'SELL' ? `${reservationLabel('SELL')} · ${priceText(terms.unit_price)} / ${terms.unit}` : reservationLabel('DONATE')
}

// Whether the viewer is the party who must decide this pending reservation.
export function viewerIsApprover(reservation: Reservation, viewerId: string | null): boolean {
  return viewerId !== null && viewerId === String(approverOf(reservation).id)
}

// Inbox follow-up line describing what the viewer should do next.
export function followUpText(reservation: Reservation, viewerId: string | null): string {
  const role = viewerRole(reservation, viewerId)
  const qty = `${quantityText(reservation.terms.quantity)} ${reservation.terms.unit}`
  const other = role === 'provider' ? reservation.receiver.display_name : reservation.provider.display_name
  if (reservation.status === 'PENDING') {
    if (viewerIsApprover(reservation, viewerId)) return `${other} ${reservation.source_type === 'LISTING_CLAIM' ? 'meminta' : 'menawarkan'} ${qty}`
    return `Menunggu keputusan ${approverOf(reservation).display_name}`
  }
  if (reservation.status === 'ACCEPTED') return reservation.pickup ? 'Pickup sudah dijadwalkan' : 'Koordinasikan waktu pickup'
  if (reservation.status === 'REJECTED') return 'Pengajuan ditolak'
  return 'Reservation dibatalkan'
}

// Inbox action button label, routed to the detail page.
export function actionLabel(reservation: Reservation, viewerId: string | null): string {
  if (reservation.status === 'PENDING' && viewerIsApprover(reservation, viewerId)) return reservation.source_type === 'LISTING_CLAIM' ? 'Tinjau claim' : 'Tinjau penawaran'
  return 'Lihat detail'
}

export function reservationError(error: unknown): string {
  if (error instanceof RangeError) return 'ID reservation tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return 'Kamu tidak memiliki akses ke reservation ini.'
    if (error.status === 404) return 'Reservation tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan reservation belum tersedia. Coba lagi nanti.'
  }
  return 'Reservation belum dapat dibuka. Periksa koneksi dan coba lagi.'
}

// Does this error mean the approver/submitter saw a stale version and must
// reload before deciding again (contract 7.4.5-7.4.7 stale_version)?
export function isStaleVersion(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.errors.some(item => item.code === 'stale_version')
}

// Error copy for revise/accept/reject/cancel actions (contract §9). Covers the
// stale_version / invalid_transition / insufficient_quantity / deadline_passed /
// source_not_accepting / terms_mismatch conflict codes without false success.
export function actionError(error: unknown): string {
  if (error instanceof RangeError) return 'ID reservation tidak valid.'
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Periksa kembali data yang kamu masukkan.'
    if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
    if (error.status === 403) return error.errors.some(item => item.code === 'csrf_failed') ? 'Verifikasi keamanan gagal. Coba kirim kembali.' : 'Kamu tidak berhak melakukan tindakan ini pada reservation ini.'
    if (error.status === 404) return 'Reservation tidak ditemukan atau tidak dapat diakses.'
    if (error.status === 409) {
      if (error.errors.some(item => item.code === 'stale_version')) return 'Pengajuan sudah diperbarui. Data dimuat ulang — tinjau versi terbaru sebelum melanjutkan.'
      if (error.errors.some(item => item.code === 'invalid_transition')) return 'Status reservation sudah berubah sehingga tindakan ini tidak berlaku lagi. Data dimuat ulang.'
      if (error.errors.some(item => item.code === 'insufficient_quantity')) return 'Jumlah melebihi yang tersedia saat ini. Sesuaikan jumlah lalu coba lagi.'
      if (error.errors.some(item => item.code === 'deadline_passed')) return 'Batas waktu resource sudah terlewati sehingga tindakan tidak dapat dilakukan.'
      if (error.errors.some(item => item.code === 'source_not_accepting')) return 'Sumber sudah ditutup atau kedaluwarsa sehingga tidak dapat diterima.'
      if (error.errors.some(item => item.code === 'terms_mismatch')) return 'Terms tidak lagi sesuai dengan sumber terbaru.'
      return 'Tindakan berbenturan dengan status terbaru. Data dimuat ulang.'
    }
    if (error.status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 501) return 'Layanan reservation belum tersedia. Coba lagi nanti.'
  }
  return 'Tindakan belum dapat diproses. Periksa koneksi dan coba lagi.'
}

// Inline field error for the revised quantity, when the server attributes it.
export function actionFieldError(error: unknown): string | undefined {
  if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
    const item = error.errors.find(entry => entry.field === 'quantity' && typeof entry.message === 'string')
    if (item) return item.message.slice(0, 300)
  }
}
