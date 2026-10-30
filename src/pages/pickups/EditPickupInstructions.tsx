import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import { ApiError } from '../../services/api.ts'
import { pickupsApi, type Pickup } from '../../services/pickups.ts'
import { reservationsApi } from '../../services/reservations.ts'
import { quantityText, supplyLabel } from '../supply/model.ts'
import type { ReservationForPickup } from './scheduleModel.ts'
import { jakartaDateTime, pickupStatusLabel, reservationReference } from './scheduleModel.ts'

export default function EditPickupInstructions() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [pickup, setPickup] = useState<Pickup | null>(null)
  const [reservation, setReservation] = useState<ReservationForPickup | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [instructions, setInstructions] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      const value = await pickupsApi.detail(id, { signal: controller.signal }) as Pickup
      const related = await reservationsApi.detail(String(value.reservation_id), {
        signal: controller.signal,
      }) as ReservationForPickup
      if (controller.signal.aborted) return
      setPickup(value)
      setReservation(related)
      setInstructions(value.instructions || '')
      setError(null)
      setLoadedFor(id)
      setNow(Date.now())
    }).catch(failure => {
      if (controller.signal.aborted) return
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      setError(
        failure instanceof ApiError && failure.status === 404
          ? 'Pickup tidak ditemukan atau tidak dapat diakses.'
          : 'Detail pickup belum dapat dimuat. Periksa koneksi lalu coba lagi.',
      )
      setLoadedFor(id)
    })
    return () => controller.abort()
  }, [id, loadAttempt, clearSession])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pickup || submitting.current) return
    const value = instructions.trim()
    if (instructions.length > 2000) {
      setFieldError('Instruksi maksimal 2.000 karakter.')
      return
    }
    submitting.current = true
    setSaving(true)
    setSaveError(null)
    setFieldError(null)
    setSaved(false)
    try {
      const updated = await pickupsApi.update(pickup.id, { instructions: value || null })
      setPickup(updated)
      setInstructions(updated.instructions || '')
      setSaved(true)
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      const codes = failure instanceof ApiError ? failure.errors.map(item => item.code) : []
      if (failure instanceof ApiError && failure.errors.some(item => item.field === 'instructions')) {
        setFieldError('Instruksi ditolak. Maksimal 2.000 karakter; boleh dikosongkan.')
      } else if (failure instanceof ApiError && failure.status === 403) {
        setSaveError('Hanya provider pada reservation ini yang dapat mengubah instruksi pickup.')
      } else if (failure instanceof ApiError && failure.status === 404) {
        setSaveError('Pickup tidak ditemukan atau tidak dapat diakses.')
      } else if (failure instanceof ApiError && failure.status === 409 && codes.includes('deadline_passed')) {
        setSaveError('Batas resource sudah lewat. Instruksi pickup tidak dapat diubah.')
      } else if (failure instanceof ApiError && failure.status === 409) {
        setSaveError('Pickup tidak lagi dapat diedit. Muat ulang untuk melihat status terbaru.')
      } else if (failure instanceof ApiError && failure.status === 401) {
        setSaveError('Sesi berakhir. Masuk kembali untuk melanjutkan.')
      } else {
        setSaveError('Instruksi belum berhasil disimpan. Periksa koneksi lalu coba lagi.')
      }
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  if (loadedFor === id && error) {
    return (
      <section className="mx-auto flex w-full max-w-320 flex-col gap-4 px-6 py-10 nav:px-12 nav:py-12">
        <Link className="inline-flex min-h-11 items-center text-sm text-primary-hover" to={`/pickups/${encodeURIComponent(id)}`}>
          ← Kembali ke detail pickup
        </Link>
        <Alert tone="danger" title="Pickup gagal dimuat">{error}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setLoadedFor(null)
            setLoadAttempt(value => value + 1)
          }}
        >
          Coba lagi
        </Button>
      </section>
    )
  }

  if (loadedFor !== id || !pickup || !reservation) {
    return (
      <section className="mx-auto w-full max-w-320 px-6 py-10 nav:px-12 nav:py-12" role="status" aria-busy="true">
        Memuat instruksi pickup…
      </section>
    )
  }

  const isProvider = reservation.provider?.id === auth.user?.id
  const isReceiver = reservation.receiver?.id === auth.user?.id
  const roleLabel = isProvider ? 'Anda provider' : isReceiver ? 'Anda receiver' : 'Peserta reservasi'
  const deadline = reservation.accepted_snapshot?.resource_deadline
  const deadlineTimestamp = deadline ? Date.parse(deadline) : NaN
  const deadlinePassed = !Number.isFinite(deadlineTimestamp) || now === null || deadlineTimestamp <= now
  const canEdit = isProvider && pickup.status === 'SCHEDULED' && reservation.status === 'ACCEPTED' && !deadlinePassed
  const unchanged = instructions.trim() === (pickup.instructions || '')
  const detailPath = `/pickups/${encodeURIComponent(String(pickup.id))}`
  const snapshot = reservation.accepted_snapshot
  const resourceType = snapshot?.resource_type || snapshot?.category
  const location = snapshot?.location || pickup.location
  const scheduledDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(pickup.scheduled_at))
  const scheduledDate = ['year', 'month', 'day']
    .map(part => scheduledDateParts.find(item => item.type === part)?.value || '')
    .join('-')
  const scheduledTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(pickup.scheduled_at))

  return (
    <section
      className="mx-auto flex w-full max-w-320 flex-col gap-6 px-6 py-8 nav:gap-7 nav:px-12 nav:py-12"
      aria-labelledby="edit-instructions-heading"
    >
      <Link className="inline-flex min-h-11 items-center text-sm text-primary-hover" to={detailPath}>
        ← Kembali ke detail pickup
      </Link>
      <header className="flex flex-col items-start gap-3">
        <h1 id="edit-instructions-heading" className="m-0 font-brand text-[28px] font-bold nav:text-[32px]">
          Edit instruksi pickup
        </h1>
        <p className="m-0 text-muted">{reservationReference(reservation.id)} · {roleLabel}</p>
        <Badge status={pickup.status}>{pickupStatusLabel(pickup.status)}</Badge>
        <p className="m-0 max-w-180 text-sm leading-6 text-muted">
          Perbarui petunjuk pengambilan untuk receiver. Waktu dan lokasi pickup tetap mengikuti kesepakatan.
        </p>
      </header>

      {!canEdit && (
        <Alert tone="warning" title="Instruksi tidak dapat diedit">
          {!isProvider
            ? 'Hanya provider pada reservation ini yang dapat mengubah instruksi.'
            : pickup.status !== 'SCHEDULED' || reservation.status !== 'ACCEPTED'
              ? 'Instruksi hanya dapat diubah selama pickup masih terjadwal dan reservation berstatus ACCEPTED.'
              : 'Batas resource sudah lewat atau tidak tersedia; instruksi tidak dapat diubah.'}
        </Alert>
      )}

      {saveError && <Alert tone="danger" title="Instruksi belum tersimpan">{saveError}</Alert>}
      {saved && <Alert tone="success" title="Instruksi diperbarui">Perubahan berhasil disimpan.</Alert>}

      <div className="grid items-start gap-6 nav:grid-cols-[1.05fr_0.95fr] nav:gap-6">
        {snapshot ? (
          <AgreementSummary
            reference={resourceType ? supplyLabel(resourceType) : 'Resource'}
            title={snapshot.title || 'Resource pada reservasi'}
            provider={reservation.provider?.display_name || 'Provider'}
            receiver={reservation.receiver?.display_name || 'Receiver'}
            quantity={snapshot.quantity != null ? quantityText(snapshot.quantity) : undefined}
            unit={snapshot.unit}
            sharingLabel={snapshot.mode ? supplyLabel(snapshot.mode) : undefined}
            deadlineLabel="Batas konsumsi"
            deadline={deadline ? jakartaDateTime(deadline) : undefined}
            location={`${location.label}, ${location.area}`}
            condition={snapshot.condition}
          />
        ) : (
          <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:p-6">
            <h2 className="m-0 text-xl font-semibold">Kesepakatan pickup</h2>
            <p className="m-0 text-sm text-muted">Detail resource pada reservation tidak tersedia.</p>
            <p className="m-0 text-sm font-medium">Lokasi: {pickup.location.label}, {pickup.location.area}</p>
          </section>
        )}

        <form
          onSubmit={save}
          className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4 nav:p-6"
          aria-busy={saving}
        >
          <div>
            <h2 className="m-0 text-xl font-bold">Perbarui instruksi pickup</h2>
            <p className="mb-0 mt-3 text-sm text-muted">
              Tanggal dan waktu sudah disepakati. Hanya instruksi yang dapat diubah.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tanggal pickup">
              <Input name="pickup_date" type="date" value={scheduledDate} disabled readOnly />
            </FormField>
            <FormField label="Waktu (WIB)">
              <Input name="pickup_time" type="time" value={scheduledTime} disabled readOnly />
            </FormField>
          </div>
          {deadline && (
            <p className="-mt-3 mb-0 text-sm text-muted">
              Pickup harus sebelum {jakartaDateTime(deadline)}.
            </p>
          )}
          <FormField
            label="Instruksi pickup"
            hint="Maksimal 2.000 karakter. Kosongkan untuk menghapus instruksi."
            error={fieldError || undefined}
          >
            <Textarea
              name="instructions"
              maxLength={2000}
              placeholder="Contoh: Temui saya di pintu utama. Bawa tas untuk membawa resource."
              rows={5}
              value={instructions}
              onChange={event => {
                setInstructions(event.target.value)
                setFieldError(null)
                setSaveError(null)
                setSaved(false)
              }}
              disabled={!canEdit || saving}
            />
          </FormField>
          <p className="-mt-3 m-0 text-right text-xs text-muted" aria-live="polite">
            {instructions.length}/2.000 karakter
          </p>
          <p className="-mt-2 mb-0 text-sm text-muted">
            Lokasi mengikuti kesepakatan: {pickup.location.label}, {pickup.location.area}.
          </p>
          <Button type="submit" disabled={!canEdit || saving || unchanged} loading={saving}>
            Simpan instruksi
          </Button>
          <Link
            className="fr-button w-full bg-transparent text-primary-hover shadow-none hover:bg-organic active:bg-primary-container active:opacity-100"
            to={detailPath}
          >
            Batal
          </Link>
        </form>
      </div>
    </section>
  )
}
