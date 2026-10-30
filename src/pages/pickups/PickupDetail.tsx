import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'
import Dialog from '../../components/ui/Dialog.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import { ApiError } from '../../services/api.ts'
import { bootstrapCsrf } from '../../services/auth.ts'
import { pickupsApi, type Pickup } from '../../services/pickups.ts'
import { reservationsApi } from '../../services/reservations.ts'
import { listingsApi } from '../../services/listings.ts'
import { requestsApi } from '../../services/requests.ts'
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
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [noShowOpen, setNoShowOpen] = useState(false)
  const [noShowReason, setNoShowReason] = useState('')
  const [noShowReasonError, setNoShowReasonError] = useState<string | null>(null)
  const [noShowError, setNoShowError] = useState<string | null>(null)
  const [markingNoShow, setMarkingNoShow] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const cancelSubmittingRef = useRef(false)
  const completingRef = useRef(false)
  const noShowSubmittingRef = useRef(false)

  async function refreshSource(relatedReservation: ReservationForPickup) {
    if (relatedReservation.source_type === 'LISTING_CLAIM' && relatedReservation.listing_id != null) {
      await listingsApi.detail(relatedReservation.listing_id)
      return
    }
    if (relatedReservation.source_type === 'REQUEST_OFFER' && relatedReservation.request_id != null) {
      await requestsApi.detail(relatedReservation.request_id)
      return
    }
    throw new Error('Sumber reservation tidak tersedia.')
  }

  async function refreshAfterAction(updatedPickup: Pickup) {
    setPickup(updatedPickup)
    setRefreshNotice(null)
    const [pickupResult, reservationResult] = await Promise.allSettled([
      pickupsApi.detail(updatedPickup.id) as Promise<Pickup>,
      reservationsApi.detail(String(updatedPickup.reservation_id)) as Promise<ReservationForPickup>,
    ])
    const refreshedPickup = pickupResult.status === 'fulfilled' ? pickupResult.value : updatedPickup
    const refreshedReservation = reservationResult.status === 'fulfilled'
      ? reservationResult.value
      : updatedPickup.status === 'NO_SHOW' && reservation
        ? { ...reservation, status: 'CANCELLED' }
        : reservation
    setPickup(refreshedPickup)
    if (refreshedReservation) setReservation(refreshedReservation)

    let refreshFailed = pickupResult.status === 'rejected' || reservationResult.status === 'rejected'
    if (refreshedReservation) {
      try {
        await refreshSource(refreshedReservation)
      } catch {
        refreshFailed = true
      }
    } else {
      refreshFailed = true
    }
    if (refreshFailed) {
      setRefreshNotice('Aksi berhasil, tetapi sebagian data pickup, reservation, atau counter sumber gagal dimuat ulang. Refresh halaman untuk melihat data terbaru.')
    }
  }

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  async function confirmReceipt() {
    if (!pickup || completingRef.current) return
    completingRef.current = true
    setConfirming(true)
    setActionError(null)
    setRefreshNotice(null)
    try {
      await bootstrapCsrf()
      const updated = await pickupsApi.complete(pickup.id, {}) as Pickup
      await refreshAfterAction(updated)
      setReceiptOpen(false)
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      const codes = failure instanceof ApiError ? failure.errors.map(item => item.code) : []
      const message = failure instanceof ApiError && failure.status === 403
        ? 'Hanya receiver pada reservasi ini yang dapat mengonfirmasi penerimaan.'
        : failure instanceof ApiError && failure.status === 404
          ? 'Pickup tidak ditemukan atau tidak dapat diakses.'
          : failure instanceof ApiError && failure.status === 401
            ? 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
            : failure instanceof ApiError && failure.status === 409 && codes.includes('deadline_passed')
              ? 'Batas resource sudah lewat. Penerimaan tidak dapat dikonfirmasi.'
              : failure instanceof ApiError && failure.status === 409 && codes.includes('invalid_transition')
                ? 'Pickup atau reservasi sudah berubah. Muat ulang untuk melihat status terbaru.'
                : failure instanceof ApiError && failure.status === 409
                  ? 'Pickup berubah dan tidak dapat diselesaikan. Muat ulang untuk melihat status terbaru.'
                  : 'Konfirmasi penerimaan belum berhasil. Periksa koneksi lalu coba lagi.'
      setActionError(message)
    } finally {
      completingRef.current = false
      setConfirming(false)
    }
  }

  async function markNoShow() {
    if (!pickup || noShowSubmittingRef.current) return
    const reason = noShowReason.trim()
    if (!reason) {
      setNoShowReasonError('Alasan wajib diisi.')
      return
    }
    if (reason.length > 1000) {
      setNoShowReasonError('Alasan maksimal 1.000 karakter.')
      return
    }

    noShowSubmittingRef.current = true
    setMarkingNoShow(true)
    setNoShowError(null)
    setNoShowReasonError(null)
    setRefreshNotice(null)
    try {
      await bootstrapCsrf()
      const updated = await pickupsApi.noShow(pickup.id, { reason }) as Pickup
      await refreshAfterAction(updated)
      setNoShowOpen(false)
      setNoShowReason('')
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      const codes = failure instanceof ApiError ? failure.errors.map(item => item.code) : []
      if (failure instanceof ApiError && failure.status === 403) {
        setNoShowError('Hanya provider pada reservasi ini yang dapat mencatat pickup tidak hadir.')
      } else if (failure instanceof ApiError && failure.status === 404) {
        setNoShowError('Pickup tidak ditemukan atau tidak dapat diakses.')
      } else if (failure instanceof ApiError && failure.status === 401) {
        setNoShowError('Sesi berakhir. Masuk kembali untuk melanjutkan.')
      } else if (failure instanceof ApiError && failure.status === 400 && failure.errors.some(item => item.field === 'reason')) {
        setNoShowReasonError('Alasan wajib diisi dan maksimal 1.000 karakter.')
      } else if (failure instanceof ApiError && failure.status === 409 && codes.includes('pickup_time_not_passed')) {
        setNoShowError('No-show hanya dapat dicatat setelah waktu pickup terlewati.')
      } else if (failure instanceof ApiError && failure.status === 409 && codes.includes('deadline_passed')) {
        setNoShowError('Batas resource sudah lewat. Pickup tidak dapat ditandai tidak hadir.')
      } else if (failure instanceof ApiError && failure.status === 409 && codes.includes('invalid_transition')) {
        setNoShowError('Pickup atau reservasi sudah berubah. Muat ulang untuk melihat status terbaru.')
      } else if (failure instanceof ApiError && failure.status === 409) {
        setNoShowError('Pickup berubah dan tidak dapat ditandai tidak hadir. Muat ulang untuk melihat status terbaru.')
      } else {
        setNoShowError('No-show belum berhasil dicatat. Periksa koneksi lalu coba lagi.')
      }
    } finally {
      noShowSubmittingRef.current = false
      setMarkingNoShow(false)
    }
  }

  async function cancelReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reservation || !pickup || cancelSubmittingRef.current) return
    const reason = cancelReason.trim()
    if (!reason) {
      setCancelReasonError('Isi alasan terlebih dahulu.')
      return
    }
    if (reason.length > 1000) {
      setCancelReasonError('Alasan terlalu panjang.')
      return
    }
    cancelSubmittingRef.current = true
    setCancelling(true)
    setCancelError(null)
    setCancelReasonError(null)
    try {
      await bootstrapCsrf()
      await reservationsApi.cancel(reservation.id, { reason })
      await refreshAfterAction({ ...pickup, status: 'CANCELLED', cancelled_at: new Date().toISOString() })
      setCancelOpen(false)
      setCancelReason('')
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      if (failure instanceof ApiError && failure.status === 400 && failure.errors.some(item => item.field === 'reason')) {
        setCancelReasonError('Alasan wajib diisi dan maksimal 1.000 karakter.')
      } else if (failure instanceof ApiError && failure.status === 409) {
        setCancelError('Reservasi berubah dan tidak dapat dibatalkan. Muat ulang untuk melihat status terbaru.')
        setAttempt(value => value + 1)
      } else {
        setCancelError(failure instanceof ApiError && failure.status === 401
          ? 'Sesi berakhir. Masuk kembali untuk melanjutkan.'
          : 'Reservasi belum dapat dibatalkan. Periksa koneksi lalu coba lagi.')
      }
    } finally {
      cancelSubmittingRef.current = false
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
  const isNoShow = pickup.status === 'NO_SHOW'
  const deadline = snapshot?.resource_deadline
  const deadlineTimestamp = deadline ? Date.parse(deadline) : NaN
  const scheduledTimestamp = Date.parse(pickup.scheduled_at)
  const eligibleReservation = reservation.status === 'ACCEPTED'
  const beforeDeadline = now !== null && Number.isFinite(deadlineTimestamp) && now < deadlineTimestamp
  const canConfirm = isReceiver && eligibleReservation && pickup.status === 'SCHEDULED' && beforeDeadline
  const canRecordNoShow =
    isProvider && eligibleReservation && pickup.status === 'SCHEDULED' &&
    now !== null && Number.isFinite(scheduledTimestamp) && now > scheduledTimestamp && beforeDeadline
  const canCancel =
    (isReceiver || isProvider) && eligibleReservation && pickup.status === 'SCHEDULED' && beforeDeadline
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
          {pickup.status === 'COMPLETED'
            ? 'Pickup selesai'
            : isNoShow
              ? 'Pickup tidak terlaksana'
              : isCancelled
                ? 'Pickup dibatalkan'
                : 'Pickup terjadwal'}
        </h1>
        <p className="m-0 text-muted">
          {reservationReference(reservation.id)} · {roleLabel}
        </p>
        <Badge status={pickup.status} tone={isCancelled ? 'success' : undefined}>
          {pickupStatusLabel(pickup.status)}
        </Badge>
      </header>

      {refreshNotice && (
        <Alert tone="info" title="Aksi berhasil; refresh data belum lengkap">
          {refreshNotice}
        </Alert>
      )}

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
          {pickup.status === 'COMPLETED' && (
            <div className="rounded-md bg-organic p-4">
              <h3 className="m-0 text-base font-bold">Pickup selesai</h3>
              <p className="mt-2 mb-0 text-sm">
                Receiver mengonfirmasi seluruh resource telah diterima.
              </p>
            </div>
          )}
          {isNoShow && (
            <div className="rounded-md bg-organic p-4">
              <h3 className="m-0 text-base font-bold">Reservasi dibatalkan</h3>
              <p className="mt-2 mb-0 text-sm">
                Pickup ditandai tidak hadir. Reservasi dibatalkan dan alokasi resource diperbarui.
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
          {isProvider && pickup.status === 'SCHEDULED' && eligibleReservation &&
            now !== null && Number.isFinite(scheduledTimestamp) && now <= scheduledTimestamp && beforeDeadline && (
              <p className="m-0 text-xs text-muted">
                Opsi tandai tidak hadir tersedia setelah waktu pickup terlewati.
              </p>
            )}
          {canRecordNoShow && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setNoShowError(null)
                setNoShowReasonError(null)
                setNoShowOpen(true)
              }}
              disabled={markingNoShow}
            >
              Tandai tidak hadir
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
                  setCancelReasonError(null)
                  setCancelReason('')
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
          Konfirmasi setelah seluruh {pickupQuantity || 'resource'} diterima. Pickup akan ditandai selesai. Ini bukan verifikasi pembayaran.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={noShowOpen}
        title="Tandai pickup tidak hadir?"
        confirmLabel="Ya, tandai tidak hadir"
        destructive
        loading={markingNoShow}
        stacked
        onCancel={() => setNoShowOpen(false)}
        onConfirm={markNoShow}
      >
        {noShowError && (
          <Alert tone="danger" title="No-show belum tersimpan">
            {noShowError}
          </Alert>
        )}
        <div className="flex flex-col gap-4">
          <p className="m-0">
            Jika receiver tidak hadir, pickup akan ditandai tidak hadir dan reservation dibatalkan. Tindakan ini tidak dapat dibuka kembali.
          </p>
          <FormField
            label="Alasan no-show"
            required
            hint={`${noShowReason.length}/1.000 karakter`}
            error={noShowReasonError || undefined}
          >
            <Textarea
              name="reason"
              value={noShowReason}
              maxLength={1000}
              onChange={event => {
                setNoShowReason(event.target.value)
                setNoShowReasonError(null)
                setNoShowError(null)
              }}
              placeholder="Jelaskan alasan receiver tercatat tidak hadir."
              rows={4}
            />
          </FormField>
        </div>
      </ConfirmDialog>
      <Dialog open={cancelOpen} title="Batalkan reservasi" onClose={cancelling ? undefined : () => setCancelOpen(false)}>
        <p className="m-0 mb-3 text-sm text-muted">Reservasi akan dibatalkan. Alokasi yang diterima dilepas dan pickup terjadwal ikut dibatalkan. Sumber yang sudah ditutup/kedaluwarsa tidak dibuka kembali.</p>
        {cancelError && <div className="mb-3"><Alert tone="danger" title="Tindakan belum selesai">{cancelError}</Alert></div>}
        <form onSubmit={cancelReservation}>
          <label className="mb-1 block text-sm font-semibold" htmlFor="pickup-cancel-reason">Alasan</label>
          <Textarea id="pickup-cancel-reason" name="reason" value={cancelReason} onChange={event => { setCancelReason(event.target.value); setCancelReasonError(null) }} maxLength={1000} aria-invalid={Boolean(cancelReasonError)} disabled={cancelling} />
          {cancelReasonError && <p className="mt-1 mb-0 text-sm text-danger">{cancelReasonError}</p>}
          <div className="mt-4 flex gap-3 [&>button]:h-11 [&>button]:flex-1 [&>button]:py-0">
            <Button type="button" variant="secondary" disabled={cancelling} onClick={() => setCancelOpen(false)}>Batal</Button>
            <Button type="submit" variant="destructive" loading={cancelling}>Batalkan reservasi</Button>
          </div>
        </form>
      </Dialog>
    </article>
  )
}
