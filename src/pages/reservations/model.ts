import { ApiError } from '../../services/api.ts'

const labels: Record<string, string> = {
  PACKAGED_FOOD_SURPLUS: 'Makanan kemasan', COMPOSTABLE_FOOD_WASTE: 'Sisa organik',
  HUMAN_CONSUMPTION: 'Konsumsi manusia', ANIMAL_FEED: 'Pakan hewan', COMPOSTING: 'Kompos', BSF: 'Pakan maggot (BSF)', UPCYCLING: 'Olahan kembali',
  DONATE: 'Donasi', SELL: 'Jual',
  PENDING: 'Menunggu persetujuan', ACCEPTED: 'Diterima', REJECTED: 'Ditolak', CANCELLED: 'Dibatalkan',
  LISTING_CLAIM: 'Claim listing', REQUEST_OFFER: 'Penawaran request',
}
export const reservationLabel = (value: string) => labels[value] || value.replaceAll('_', ' ')
export const quantityText = (value: string | number) => String(value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
export const priceText = (value: string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(value))
export function deadlineText(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date)} WIB` : 'Waktu tidak tersedia'
}

import type { Reservation } from '../../services/reservations.ts'

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
