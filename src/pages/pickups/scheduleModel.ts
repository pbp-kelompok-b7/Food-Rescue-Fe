import { ApiError } from '../../services/api.ts'
import type { PickupLocation } from '../../services/pickups.ts'

export interface AcceptedSnapshot {
  title?: string
  category?: string
  resource_type?: string
  quantity?: number | string
  unit?: string
  mode?: string
  condition?: string
  resource_deadline?: string
  location?: PickupLocation
}

export interface ReservationForPickup {
  id: number | string
  source_type?: 'LISTING_CLAIM' | 'REQUEST_OFFER' | string
  listing_id?: number | null
  request_id?: number | null
  status: string
  provider: { id: number; display_name?: string }
  receiver: { id: number; display_name?: string }
  accepted_snapshot: AcceptedSnapshot | null
  pickup: { id: number | string } | null
  counterparty_contact?: { user_id: number; whatsapp_number: string | null; whatsapp_url?: string | null } | null
}

export function reservationReference(id: number | string) {
  const value = String(id)
  return `RSV-${/^\d+$/.test(value) ? value.padStart(3, '0') : value}`
}

export function pickupStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'Terjadwal',
    COMPLETED: 'Selesai',
    NO_SHOW: 'Tidak hadir',
    CANCELLED: 'Dibatalkan',
  }
  return labels[status] || status.replaceAll('_', ' ')
}

// datetime-local values are local wall time; the contract defines this form as Asia/Jakarta.
export function jakartaInputToTimestamp(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  const utc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute))
  const date = new Date(utc)
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59) return null
  return `${value}:00+07:00`
}

export function jakartaNowInput(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  const currentMinute = Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')), Number(part('hour')), Number(part('minute')))
  const next = new Date(currentMinute + 60_000)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}T${String(next.getUTCHours()).padStart(2, '0')}:${String(next.getUTCMinutes()).padStart(2, '0')}`
}

export function validatePickupSchedule(value: string, instructions: string, deadline: string | undefined, now = Date.now()) {
  const errors: Record<string, string> = {}
  const timestamp = jakartaInputToTimestamp(value)
  if (!timestamp) errors.scheduled_at = 'Masukkan tanggal dan waktu pickup yang valid.'
  else {
    const scheduled = Date.parse(timestamp)
    if (scheduled <= now) errors.scheduled_at = 'Jadwal pickup harus berada di masa depan (WIB).'
    const deadlineTime = deadline ? Date.parse(deadline) : NaN
    if (!Number.isFinite(deadlineTime)) errors.scheduled_at = 'Batas waktu resource pada snapshot tidak tersedia. Hubungi dukungan sebelum menjadwalkan.'
    else if (scheduled >= deadlineTime) errors.scheduled_at = 'Jadwal pickup harus sebelum batas waktu resource.'
  }
  if (instructions.length > 2000) errors.instructions = 'Instruksi maksimal 2.000 karakter.'
  return errors
}

export function pickupScheduleError(error: unknown) {
  if (!(error instanceof ApiError)) return 'Pickup belum dapat dijadwalkan. Periksa koneksi dan coba lagi.'
  const codes = error.errors.map(item => item.code)
  if (error.status === 401) return 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
  if (error.status === 403) return codes.includes('csrf_failed')
    ? 'Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.'
    : 'Hanya provider yang berhak menjadwalkan pickup ini.'
  if (error.status === 404) return 'Reservation tidak ditemukan atau tidak dapat diakses.'
  if (error.status === 409) {
    if (codes.includes('pickup_exists')) return 'Pickup untuk reservation ini sudah dijadwalkan. Buka detail pickup untuk melihat jadwalnya.'
    if (codes.includes('contact_required')) return 'Kedua pihak harus mengisi nomor WhatsApp sebelum pickup dapat dijadwalkan. Perbarui nomor akunmu di profil dan minta receiver melakukan hal yang sama.'
    if (codes.includes('deadline_passed')) return 'Batas waktu resource sudah lewat atau jadwal melewati batas tersebut.'
    if (codes.includes('invalid_transition')) return 'Reservation tidak lagi berstatus ACCEPTED. Muat ulang untuk melihat status terbaru.'
    return 'Reservation berubah saat kamu menjadwalkan. Muat ulang dan periksa status terbarunya.'
  }
  if (error.status === 400) return 'Jadwal atau instruksi ditolak. Periksa kembali data yang kamu masukkan.'
  return 'Pickup belum dapat dijadwalkan. Periksa koneksi dan coba lagi.'
}

export function jakartaDateTime(value: string | null | undefined) {
  if (!value) return 'Tidak tersedia'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Tidak tersedia'
  return `${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date)} WIB`
}
