import { ApiError } from '../../services/api.ts'
import { jakartaDateTime } from '../pickups/scheduleModel.ts'

export interface AdminPickup {
  id: number | string
  created_at?: string
  updated_at?: string
  version?: number
  reservation_id: number | string
  scheduled_at: string
  location: { label?: string; area?: string; latitude?: number; longitude?: number }
  instructions: string | null
  status: string
  completed_at: string | null
  no_show_at: string | null
  cancelled_at?: string | null
  reason?: string | null
  history?: { action?: string; reason?: string; created_at?: string; actor?: { display_name?: string } }[]
}

export interface AdminPickupPage {
  count: number
  next: string | null
  previous: string | null
  results: AdminPickup[]
}

export interface AdminReservation {
  id: number | string
  created_at?: string
  accepted_at?: string | null
  status: string
  provider?: { id?: number; display_name?: string; email?: string; whatsapp_number?: string | null }
  receiver?: { id?: number; display_name?: string; email?: string; whatsapp_number?: string | null }
  accepted_snapshot?: {
    title?: string
    quantity?: string | number
    unit?: string
    mode?: string
    condition?: string
    resource_type?: string
    resource_deadline?: string
    location?: { label?: string; area?: string }
  } | null
  terms?: {
    title?: string
    quantity?: string | number
    unit?: string
    mode?: string
    condition?: string
    resource_type?: string
    resource_deadline?: string
    location?: { label?: string; area?: string }
  } | null
  pickup?: { id?: number | string; status?: string; scheduled_at?: string } | null
  reason?: string | null
  cancellation_code?: string | null
  history?: { action?: string; reason?: string; created_at?: string; actor?: { display_name?: string } }[]
}

export function adminPickupError(error: unknown, action: 'list' | 'detail' | 'schedule' | 'instructions' | 'complete' | 'no-show' = 'detail') {
  if (!(error instanceof ApiError)) return action === 'list'
    ? 'Daftar pickup belum dapat dimuat. Periksa koneksi dan coba lagi.'
    : 'Permintaan belum dapat diproses. Periksa koneksi dan coba lagi.'
  const codes = error.errors.map(item => item.code)
  if (error.status === 401) return 'Sesi berakhir. Masuk kembali sebagai admin.'
  if (error.status === 403) return codes.includes('csrf_failed')
    ? 'Verifikasi keamanan gagal. Coba kirim kembali.'
    : 'Hanya admin yang dapat melakukan tindakan ini.'
  if (error.status === 404 && codes.includes('page_not_found')) return 'Halaman pickup tidak ditemukan.'
  if (error.status === 404) return action === 'schedule'
    ? 'Reservation tidak ditemukan atau tidak dapat diakses.'
    : 'Pickup tidak ditemukan atau tidak dapat diakses.'
  if (error.status === 400) return action === 'schedule'
    ? 'Data jadwal tidak valid. Periksa kembali tanggal, instruksi, dan alasan.'
    : 'Data tindakan tidak valid. Periksa kembali instruksi dan alasan.'
  if (error.status === 409) {
    if (codes.includes('contact_required')) return 'Pickup belum dapat dijadwalkan karena kontak WhatsApp kedua pihak belum lengkap.'
    if (codes.includes('pickup_exists')) return 'Reservation ini sudah memiliki pickup. Muat ulang daftar untuk melihat pickup tersebut.'
    if (codes.includes('pickup_time_not_passed')) return 'No-show hanya dapat dicatat setelah waktu pickup terlewati.'
    if (codes.includes('deadline_passed')) return 'Deadline resource sudah lewat. Tindakan ini tidak dapat dilakukan.'
    if (codes.includes('invalid_transition')) return 'Status reservation atau pickup sudah berubah. Data terbaru dimuat ulang.'
    return 'Data pickup berubah atau tidak memenuhi aturan. Muat ulang sebelum mencoba lagi.'
  }
  return 'Permintaan belum dapat diproses. Periksa koneksi dan coba lagi.'
}

export function formatAdminPickupDate(value?: string | null) {
  return value ? jakartaDateTime(value) : 'Belum tersedia'
}

export function adminPickupReference(id: number | string) {
  const value = String(id)
  return `PU-${/^\d+$/.test(value) ? value.padStart(3, '0') : value}`
}

export function adminStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'Terjadwal', COMPLETED: 'Selesai', NO_SHOW: 'Tidak hadir', CANCELLED: 'Dibatalkan',
    ACCEPTED: 'Diterima', PENDING: 'Menunggu',
  }
  return labels[status] || status.replaceAll('_', ' ')
}

export function acceptedSnapshot(reservation: AdminReservation) {
  return reservation.accepted_snapshot || reservation.terms || null
}

export function canAdminSchedule(reservation: AdminReservation | null) {
  return Boolean(reservation && reservation.status === 'ACCEPTED' && !reservation.pickup)
}

export function adminPickupTimeline(pickup: AdminPickup, reservation?: AdminReservation | null) {
  const items: { label: string; at?: string; reason?: string }[] = []
  if (reservation?.created_at) items.push({ label: 'Reservation diajukan', at: reservation.created_at })
  if (reservation?.accepted_at) items.push({ label: 'Reservation diterima', at: reservation.accepted_at })
  if (pickup.created_at || pickup.scheduled_at) items.push({ label: 'Pickup dijadwalkan', at: pickup.created_at || pickup.scheduled_at })
  if (pickup.completed_at) items.push({ label: 'Pickup diselesaikan', at: pickup.completed_at, reason: pickup.reason || undefined })
  if (pickup.no_show_at) items.push({ label: 'Pickup ditandai tidak hadir', at: pickup.no_show_at, reason: pickup.reason || undefined })
  if (pickup.cancelled_at) items.push({ label: 'Pickup dibatalkan', at: pickup.cancelled_at, reason: reservation?.reason || pickup.reason || undefined })
  for (const event of [...(reservation?.history || []), ...(pickup.history || [])]) {
    items.push({
      label: event.action ? adminStatusLabel(event.action) : 'Perubahan status',
      at: event.created_at,
      reason: event.reason,
    })
  }
  const stage = (label: string) => {
    const normalized = label.toLocaleLowerCase('id-ID')
    if (normalized.includes('reservation diajukan') || normalized === 'menunggu') return 0
    if (normalized.includes('reservation diterima') || normalized === 'diterima') return 1
    if (normalized.includes('pickup dijadwalkan') || normalized === 'terjadwal') return 2
    if (normalized.includes('pickup diselesaikan') || normalized.includes('tidak hadir') || normalized.includes('dibatalkan') || normalized === 'selesai') return 3
    return 2.5
  }
  return items.sort((a, b) => stage(a.label) - stage(b.label) || Date.parse(a.at || '') - Date.parse(b.at || ''))
}
