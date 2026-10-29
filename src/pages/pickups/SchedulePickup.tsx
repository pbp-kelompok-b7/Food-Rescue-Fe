import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { bootstrapCsrf, getProfile } from '../../services/auth.ts'
import { reservationsApi } from '../../services/reservations.ts'
import { pickupsApi, type PickupLocation } from '../../services/pickups.ts'
import type { User } from '../../services/types.ts'
import { quantityText, supplyLabel } from '../supply/model.ts'
import {
  jakartaDateTime,
  jakartaInputToTimestamp,
  jakartaNowInput,
  pickupScheduleError,
  reservationReference,
  validatePickupSchedule,
  type ReservationForPickup,
} from './scheduleModel.ts'

const secondaryActionClass = 'fr-button border border-outline bg-surface text-ink shadow-none hover:not-disabled:bg-organic'

export default function SchedulePickup() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [reservation, setReservation] = useState<ReservationForPickup | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [instructions, setInstructions] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const pending = useRef(false)
  const summary = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      reservationsApi.detail(id, { signal: controller.signal }),
      getProfile({ signal: controller.signal }),
    ]).then(([value, user]) => {
      if (controller.signal.aborted) return
      setReservation(value as ReservationForPickup)
      setProfile(user)
      setLoading(false)
    }).catch(error => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) clearSession()
      setLoadError(
        error instanceof ApiError && error.status === 404
          ? 'Reservation tidak ditemukan atau tidak dapat diakses.'
          : 'Data reservation belum dapat dimuat. Periksa koneksi lalu coba lagi.',
      )
      setLoading(false)
    })
    return () => controller.abort()
  }, [id, attempt, clearSession])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !reservation?.accepted_snapshot) return
    const scheduledAt = scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : ''
    const nextErrors = validatePickupSchedule(
      scheduledAt,
      instructions,
      reservation.accepted_snapshot.resource_deadline,
    )
    setErrors(nextErrors); setSubmitError(null)
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0]
      const fieldName = first === 'scheduled_at' ? 'pickup_date' : first
      event.currentTarget.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${fieldName}"]`)?.focus()
      return
    }
    pending.current = true; setSubmitting(true)
    try {
      const pickup = await pickupsApi.schedule(id, {
        scheduled_at: jakartaInputToTimestamp(scheduledAt)!,
        instructions: instructions.trim() || null,
      })
      navigate(`/pickups/${encodeURIComponent(pickup.id)}`, { replace: true, state: { pickupScheduled: true } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession()
      setSubmitError(pickupScheduleError(error))
      requestAnimationFrame(() => summary.current?.focus())
      if (error instanceof ApiError && error.status === 409) {
        setLoading(true)
        setAttempt(value => value + 1)
      }
    } finally {
      pending.current = false; setSubmitting(false)
    }
  }

  async function cancelReservation() {
    if (cancelling) return
    setCancelling(true)
    setCancelError(null)
    try {
      await bootstrapCsrf()
      await reservationsApi.cancel(id, {
        reason: 'Dibatalkan oleh peserta melalui halaman penjadwalan pickup.',
      })
      navigate(`/reservations/${encodeURIComponent(id)}`, {
        replace: true,
        state: { reservationCancelled: true },
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession()
      setCancelError(
        error instanceof ApiError && error.status === 409
          ? 'Reservasi berubah dan tidak dapat dibatalkan. Muat ulang untuk melihat status terbaru.'
          : 'Reservasi belum dapat dibatalkan. Coba lagi.',
      )
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <section
        className="mx-auto w-full max-w-320 px-6 py-10 nav:px-12 nav:py-12"
        role="status"
        aria-busy="true"
      >
        Memuat reservation…
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex w-full max-w-320 flex-col gap-4 px-6 py-10 nav:px-12 nav:py-12">
        <Link to="/reservations">← Reservasi saya</Link>
        <Alert tone="danger" title="Reservation gagal dimuat">
          {loadError}
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setLoading(true)
            setLoadError(null)
            setAttempt(value => value + 1)
          }}
        >
          Coba lagi
        </Button>
      </section>
    )
  }
  if (!reservation) return null

  const isProvider = !!profile && reservation.provider?.id === profile.id
  const isReceiver = !!profile && reservation.receiver?.id === profile.id
  const roleLabel = isProvider
    ? 'Anda provider'
    : isReceiver
      ? 'Anda receiver'
      : 'Peserta reservasi'
  const snapshot = reservation.accepted_snapshot
  const location = snapshot?.location as PickupLocation | undefined
  const receiverContact = reservation.counterparty_contact?.whatsapp_number
  const ownContact = profile?.whatsapp_number
  const eligible = isProvider && reservation.status === 'ACCEPTED' && !reservation.pickup
  const contactsReady = !!ownContact && !!receiverContact
  const providerName = reservation.provider?.display_name || 'Provider'
  const receiverName = reservation.receiver?.display_name || 'Receiver'
  const resourceType = snapshot?.resource_type || snapshot?.category
  const sharingLabel = snapshot?.mode ? supplyLabel(snapshot.mode) : undefined
  const receiverWhatsapp =
    reservation.counterparty_contact?.whatsapp_url ||
    (receiverContact ? `https://wa.me/${receiverContact.replace(/\D/g, '')}` : null)
  const deadlineLabel = reservation.accepted_snapshot?.resource_deadline
    ? jakartaDateTime(reservation.accepted_snapshot.resource_deadline)
    : 'Tidak tersedia'
  const linkBack = (
    <Link className="inline-flex min-h-11 items-center text-sm text-primary-hover" to="/reservations">
      ← Reservasi saya
    </Link>
  )

  return (
    <section
      className="mx-auto flex w-full max-w-320 flex-col gap-6 px-6 py-8 nav:gap-7 nav:px-12 nav:py-12"
      aria-labelledby="schedule-heading"
    >
      {linkBack}
      <header className="flex flex-col items-start gap-2">
        <h1
          id="schedule-heading"
          className="m-0 font-brand text-[28px] font-bold nav:text-[32px]"
        >
          Atur pickup
        </h1>
        <p className="m-0 text-muted">{reservationReference(reservation.id)} · {roleLabel}</p>
        <Badge tone="neutral">
          Belum dijadwalkan
        </Badge>
      </header>

      {!isProvider && (
        <Alert tone="warning" title="Akses khusus provider">
          Hanya provider pada reservation ini yang dapat menjadwalkan pickup.
        </Alert>
      )}
      {isProvider && reservation.status !== 'ACCEPTED' && (
        <Alert tone="warning" title="Reservation belum dapat dijadwalkan">
          Form hanya tersedia untuk reservation berstatus ACCEPTED.
        </Alert>
      )}
      {isProvider && reservation.pickup && (
        <Alert tone="info" title="Pickup sudah dijadwalkan">
          Jadwal untuk reservation ini sudah dibuat.{' '}
          <Link to={`/pickups/${encodeURIComponent(reservation.pickup.id)}`}>
            Buka detail pickup
          </Link>
          .
        </Alert>
      )}

      <div className="grid items-start gap-6 nav:grid-cols-[1.05fr_0.95fr] nav:gap-6">
        {snapshot && (
          <AgreementSummary
            reference={resourceType ? supplyLabel(resourceType) : 'Resource'}
            title={snapshot.title || 'Resource pada reservasi'}
            provider={providerName}
            receiver={receiverName}
            quantity={snapshot.quantity != null ? quantityText(snapshot.quantity) : undefined}
            unit={snapshot.unit}
            sharingLabel={sharingLabel}
            deadlineLabel="Batas konsumsi"
            deadline={deadlineLabel}
            location={location ? `${location.label}, ${location.area}` : undefined}
            condition={snapshot.condition}
          />
        )}

        {eligible && !contactsReady && (
          <Alert tone="warning" title="Lengkapi kontak WhatsApp">
            Provider dan receiver sama-sama harus memiliki nomor WhatsApp.{' '}
            {!ownContact && (
              <>
                Nomor WhatsApp akunmu belum lengkap;{' '}
                <Link to="/profile">perbarui di profilmu</Link>.{' '}
              </>
            )}
            {!receiverContact && (
              <>Nomor WhatsApp receiver belum tersedia; minta receiver memperbarui kontak di profilnya.</>
            )}
          </Alert>
        )}
        {submitError && (
          <div ref={summary} tabIndex={-1}>
            <Alert tone="danger" title="Pickup belum dijadwalkan">
              {submitError}
              {submitError.includes('di profil') && (
                <>
                  {' '}
                  <Link to="/profile">Buka profil</Link>.
                </>
              )}
            </Alert>
          </div>
        )}

        {eligible && snapshot && contactsReady && location && (
          <form
            onSubmit={submit}
            noValidate
            className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4 nav:p-6"
            aria-busy={submitting || cancelling}
          >
            <div>
              <h2 className="m-0 text-xl font-bold">Catat waktu yang sudah disepakati</h2>
              <p className="mb-0 mt-3 text-sm text-muted">Kedua nomor WhatsApp sudah terisi.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Tanggal pickup"
                required
                error={errors.scheduled_at}
              >
                <Input
                  name="pickup_date"
                  type="date"
                  min={jakartaNowInput().slice(0, 10)}
                  value={scheduledDate}
                  onChange={event => {
                    setScheduledDate(event.target.value)
                    setErrors(current => ({ ...current, scheduled_at: '' }))
                  }}
                  disabled={submitting}
                />
              </FormField>
              <FormField label="Waktu (WIB)" required>
                <Input
                  name="pickup_time"
                  type="time"
                  value={scheduledTime}
                  onChange={event => {
                    setScheduledTime(event.target.value)
                    setErrors(current => ({ ...current, scheduled_at: '' }))
                  }}
                  disabled={submitting}
                />
              </FormField>
            </div>
            <p className="-mt-3 mb-0 text-sm text-muted">
              Pickup harus sebelum {deadlineLabel}.
            </p>
            <FormField
              label="Instruksi pickup"
              error={errors.instructions}
            >
              <Textarea
                name="instructions"
                maxLength={2000}
                value={instructions}
                onChange={event => {
                  setInstructions(event.target.value)
                  setErrors(current => ({ ...current, instructions: '' }))
                }}
                disabled={submitting}
              />
            </FormField>
            <p className="-mt-2 mb-0 text-sm text-muted">
              Lokasi mengikuti kesepakatan: {location.label}, {location.area}.
            </p>
            <Button type="submit" loading={submitting} disabled={submitting}>
              Simpan jadwal
            </Button>
            {receiverWhatsapp && (
              <a
                className={secondaryActionClass}
                href={receiverWhatsapp}
                target="_blank"
                rel="noreferrer"
              >
                Hubungi receiver
              </a>
            )}
            <Button
              type="button"
              variant="ghost"
              className="self-center"
              onClick={() => {
                setCancelError(null)
                setCancelOpen(true)
              }}
              disabled={submitting || cancelling}
            >
              Batalkan reservasi
            </Button>
          </form>
        )}
        {eligible && snapshot && !location && (
          <Alert tone="danger" title="Lokasi snapshot tidak tersedia">
            Pickup tidak bisa dijadwalkan karena lokasi dari accepted snapshot tidak tersedia.
          </Alert>
        )}
      </div>
      <ConfirmDialog
        open={cancelOpen}
        title="Batalkan reservasi?"
        confirmLabel="Ya, batalkan"
        className="!w-[min(350px,calc(100%_-_32px))]"
        destructive
        loading={cancelling}
        stacked
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancelReservation}
      >
        {cancelError && (
          <Alert tone="danger" title="Pembatalan gagal">
            {cancelError}
          </Alert>
        )}
        Kesepakatan dan jadwal pickup yang belum selesai akan dibatalkan. Alokasi resource dilepas.
      </ConfirmDialog>
    </section>
  )
}
