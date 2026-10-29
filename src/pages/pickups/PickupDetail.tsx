import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import { ApiError } from '../../services/api.ts'
import { bootstrapCsrf } from '../../services/auth.ts'
import { pickupsApi, type Pickup } from '../../services/pickups.ts'
import { reservationsApi } from '../../services/reservations.ts'
import { quantityText, supplyLabel } from '../supply/model.ts'
import type { ReservationForPickup } from './scheduleModel.ts'
import { jakartaDateTime, pickupStatusLabel, reservationReference } from './scheduleModel.ts'

const secondaryActionClass = 'fr-button border border-outline bg-surface text-ink shadow-none hover:not-disabled:bg-organic'

export default function PickupDetail() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [pickup, setPickup] = useState<Pickup | null>(null)
  const [reservation, setReservation] = useState<ReservationForPickup | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      const value = await pickupsApi.detail(id, { signal: controller.signal }) as Pickup
      const relatedReservation = (await reservationsApi.detail(String(value.reservation_id), {
        signal: controller.signal,
      })) as ReservationForPickup
      if (!controller.signal.aborted) {
        setPickup(value)
        setReservation(relatedReservation)
        setError(null)
        setLoadedFor(id)
        setNow(Date.now())
      }
    }).catch(failure => {
      if (controller.signal.aborted) return
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      setError(
        failure instanceof ApiError && failure.status === 404
          ? 'Pickup tidak ditemukan atau tidak dapat diakses.'
          : 'Detail pickup belum dapat dimuat.',
      )
      setLoadedFor(id)
    })
    return () => controller.abort()
  }, [id, attempt, clearSession])

  async function confirmReceipt() {
    if (!pickup || confirming) return
    setConfirming(true)
    setActionError(null)
    try {
      const updated = await pickupsApi.complete(pickup.id, {}) as Pickup
      setPickup(updated)
      setReceiptOpen(false)
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      setActionError(
        failure instanceof ApiError && failure.status === 409
          ? 'Pickup berubah saat konfirmasi. Muat ulang untuk melihat status terbaru.'
          : 'Konfirmasi penerimaan belum berhasil. Coba lagi.',
      )
    } finally {
      setConfirming(false)
    }
  }

  async function cancelReservation() {
    if (!reservation || !pickup || cancelling) return
    setCancelling(true)
    setCancelError(null)
    try {
      await bootstrapCsrf()
      await reservationsApi.cancel(reservation.id, {
        reason: 'Dibatalkan oleh peserta melalui halaman detail pickup.',
      })
      setReservation({ ...reservation, status: 'CANCELLED' })
      setPickup({ ...pickup, status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      setCancelError(
        failure instanceof ApiError && failure.status === 409
          ? 'Reservasi berubah dan tidak dapat dibatalkan. Muat ulang untuk melihat status terbaru.'
          : 'Reservasi belum dapat dibatalkan. Coba lagi.',
      )
    } finally {
      setCancelling(false)
    }
  }

  if (loadedFor === id && error) {
    return (
      <section className="mx-auto flex w-full max-w-320 flex-col gap-4 px-6 py-10 nav:px-12 nav:py-12">
        <Link to="/reservations">← Reservasi saya</Link>
        <Alert tone="danger" title="Gagal memuat pickup">
          {error}
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setError(null)
            setLoadedFor(null)
            setAttempt(value => value + 1)
          }}
        >
          Coba lagi
        </Button>
      </section>
    )
  }

  if (loadedFor !== id || !pickup || !reservation) {
    return (
      <section
        className="mx-auto w-full max-w-320 px-6 py-10 nav:px-12 nav:py-12"
        role="status"
        aria-busy="true"
      >
        Memuat pickup…
      </section>
    )
  }

  const snapshot = reservation.accepted_snapshot
  const isReceiver = reservation.receiver?.id === auth.user?.id
  const isProvider = reservation.provider?.id === auth.user?.id
  const roleLabel = isReceiver ? 'Anda receiver' : isProvider ? 'Anda provider' : 'Peserta reservasi'
  const otherWhatsapp =
    reservation.status === 'ACCEPTED' && (
      reservation.counterparty_contact?.whatsapp_url ||
      (reservation.counterparty_contact?.whatsapp_number
      ? `https://wa.me/${reservation.counterparty_contact.whatsapp_number.replace(/\D/g, '')}`
      : null)
    )
  const mapUrl =
    `https://www.openstreetmap.org/?mlat=${pickup.location.latitude}` +
    `&mlon=${pickup.location.longitude}#map=16/${pickup.location.latitude}/${pickup.location.longitude}`
  const isCancelled = pickup.status === 'CANCELLED'
  const canConfirm = isReceiver && pickup.status === 'SCHEDULED'
  const canCancel = (isReceiver || isProvider) && pickup.status === 'SCHEDULED'
  const deadline = snapshot?.resource_deadline
  const deadlineTimestamp = deadline ? Date.parse(deadline) : NaN
  const canEditInstructions =
    isProvider &&
    reservation.status === 'ACCEPTED' &&
    pickup.status === 'SCHEDULED' &&
    Number.isFinite(deadlineTimestamp) &&
    now !== null &&
    deadlineTimestamp > now
  const resourceType = snapshot?.resource_type || snapshot?.category
  const sharingLabel = snapshot?.mode ? supplyLabel(snapshot.mode) : undefined
  const pickupQuantity = snapshot?.quantity != null
    ? `${quantityText(snapshot.quantity)}${snapshot.unit ? ` ${snapshot.unit}` : ''}`
    : null
  const pickupDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(pickup.scheduled_at))
  const pickupTime = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(pickup.scheduled_at))

  return (
    <article className="mx-auto flex w-full max-w-320 flex-col gap-6 px-6 py-8 nav:gap-7 nav:px-12 nav:py-12">
      <Link
        className="inline-flex min-h-11 items-center text-sm text-primary-hover"
        to="/reservations"
      >
        ← Reservasi saya
      </Link>
      <header className="flex flex-col items-start gap-2">
        <h1 className="m-0 font-brand text-[28px] font-bold nav:text-[32px]">
          {isCancelled ? 'Pickup dibatalkan' : 'Pickup terjadwal'}
        </h1>
        <p className="m-0 text-muted">
          {reservationReference(reservation.id)} · {roleLabel}
        </p>
        <Badge status={pickup.status} tone={isCancelled ? 'success' : undefined}>
          {pickupStatusLabel(pickup.status)}
        </Badge>
      </header>

      <div className="grid items-start gap-6 nav:grid-cols-[1.05fr_0.95fr] nav:gap-6">
        {snapshot && (
          <AgreementSummary
            reference={resourceType ? supplyLabel(resourceType) : 'Resource'}
            title={snapshot.title || 'Detail resource'}
            provider={reservation.provider?.display_name || 'Provider'}
            receiver={reservation.receiver?.display_name || 'Receiver'}
            quantity={snapshot.quantity != null ? quantityText(snapshot.quantity) : undefined}
            unit={snapshot.unit}
            sharingLabel={sharingLabel}
            deadline={snapshot.resource_deadline ? jakartaDateTime(snapshot.resource_deadline) : undefined}
            location={snapshot.location
              ? `${snapshot.location.label}, ${snapshot.location.area}`
              : `${pickup.location.label}, ${pickup.location.area}`}
            condition={snapshot.condition}
          />
        )}

        <section
          className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4 nav:p-6"
          aria-labelledby="pickup-time-heading"
        >
          <div>
            <h2 id="pickup-time-heading" className="m-0 text-xl font-bold">
              {pickupDate}
            </h2>
            <dl className="mt-4 mb-0 grid gap-4 text-sm">
              <div>
                <dt className="mb-1 text-muted">Waktu pickup</dt>
                <dd className="m-0 font-bold">{pickupTime} WIB</dd>
              </div>
              <div>
                <dt className="mb-1 text-muted">Lokasi</dt>
                <dd className="m-0 font-bold">
                  {pickup.location.label}, {pickup.location.area}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-muted">Instruksi provider</dt>
                <dd className="m-0 whitespace-pre-wrap font-bold">
                  {pickup.instructions || 'Tidak ada instruksi tambahan.'}
                </dd>
              </div>
            </dl>
          </div>

          {isCancelled && (
            <div className="rounded-md bg-organic p-4">
              <h3 className="m-0 text-base font-bold">Reservasi dibatalkan</h3>
              <p className="mt-2 mb-0 text-sm">
                Kesepakatan dibatalkan. Alokasi resource dilepas.
              </p>
            </div>
          )}
          {canConfirm && (
            <Button
              onClick={() => {
                setActionError(null)
                setReceiptOpen(true)
              }}
              disabled={confirming}
            >
              Konfirmasi penerimaan
            </Button>
          )}
          {otherWhatsapp ? (
            <a
              className={`${secondaryActionClass} w-full`}
              href={otherWhatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Hubungi {isReceiver ? 'provider' : 'receiver'}
            </a>
          ) : null}
          <a
            className={`${secondaryActionClass} w-full`}
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Buka lokasi
          </a>
          <Link
            className={`${secondaryActionClass} w-full`}
            to={`/reservations/${encodeURIComponent(String(reservation.id))}`}
          >
            Lihat reservasi
          </Link>
          {canConfirm && (
            <p className="m-0 text-xs text-muted">
              {pickupQuantity
                ? `Konfirmasi setelah seluruh ${pickupQuantity} diterima.`
                : 'Konfirmasi setelah seluruh resource diterima.'}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {canEditInstructions && (
              <Link
                className={`${secondaryActionClass} w-full`}
                to={`/pickups/${encodeURIComponent(String(pickup.id))}/edit`}
              >
                Edit instruksi pickup
              </Link>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="ghost"
                className="mt-1 w-full font-medium"
                onClick={() => {
                  setCancelError(null)
                  setCancelOpen(true)
                }}
              >
                Batalkan reservasi
              </Button>
            )}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={receiptOpen}
        title="Konfirmasi penerimaan?"
        confirmLabel="Ya, saya sudah menerima"
        loading={confirming}
        stacked
        onCancel={() => setReceiptOpen(false)}
        onConfirm={confirmReceipt}
      >
        {actionError && (
          <Alert tone="danger" title="Konfirmasi belum tersimpan">
            {actionError}
          </Alert>
        )}
        <p className="m-0">
          Konfirmasi setelah seluruh {pickupQuantity || 'resource'} diterima. Pickup akan ditandai selesai.
        </p>
      </ConfirmDialog>
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
    </article>
  )
}
