import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import PickupStatus from '../../components/transactions/PickupStatus.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import Dialog from '../../components/ui/Dialog.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { bootstrapCsrf } from '../../services/auth.ts'
import { adminApi } from '../../services/admin.ts'
import { quantityText, supplyLabel } from '../supply/model.ts'
import {
  acceptedSnapshot,
  adminPickupError,
  adminPickupReference,
  adminPickupTimeline,
  adminStatusLabel,
  formatAdminPickupDate,
  type AdminPickup,
  type AdminReservation,
} from './pickupsModel.ts'

type DialogAction = 'instructions' | 'complete' | 'no-show' | null

export default function AdminPickupDetail() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [pickup, setPickup] = useState<AdminPickup | null>(null)
  const [reservation, setReservation] = useState<AdminReservation | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reservationError, setReservationError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loadKey = `${id}:${attempt}`
  const [now, setNow] = useState<number | null>(null)
  const [dialog, setDialog] = useState<DialogAction>(null)
  const [reason, setReason] = useState('')
  const [instructions, setInstructions] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const submitting = useRef(false)

  useEffect(() => {
    let active = true
    adminApi.getPickup(id).then(async value => {
      const currentPickup = value as AdminPickup
      if (!active) return
      setPickup(currentPickup)
      setLoadedFor(loadKey)
      setNow(Date.now())
      try {
        const relatedReservation = await adminApi.getReservation(currentPickup.reservation_id) as AdminReservation
        if (active) {
          setReservation(relatedReservation)
          setReservationError(null)
        }
      } catch (error) {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) clearSession()
        setReservation(null)
        setReservationError(adminPickupError(error, 'detail'))
      }
    }).catch(error => {
      if (!active) return
      if (error instanceof ApiError && error.status === 401) clearSession()
      setLoadError(adminPickupError(error, 'detail'))
      setLoadedFor(loadKey)
    })
    return () => { active = false }
  }, [id, attempt, clearSession, loadKey])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  async function reloadDetail(fallbackPickup?: AdminPickup) {
    const targetPickup = fallbackPickup || pickup
    if (!targetPickup) return false
    const [pickupResult, reservationResult] = await Promise.allSettled([
      adminApi.getPickup(targetPickup.id) as Promise<AdminPickup>,
      adminApi.getReservation(targetPickup.reservation_id) as Promise<AdminReservation>,
    ])
    if (pickupResult.status === 'fulfilled') setPickup(pickupResult.value)
    else if (fallbackPickup) setPickup(fallbackPickup)
    if (reservationResult.status === 'fulfilled') {
      setReservation(reservationResult.value)
      setReservationError(null)
    } else {
      setReservationError('Detail reservation belum dapat dimuat ulang.')
    }
    return pickupResult.status === 'fulfilled' && reservationResult.status === 'fulfilled'
  }

  async function refreshAfterAction(updated: AdminPickup) {
    setPickup(updated)
    const refreshed = await reloadDetail(updated)
    if (!refreshed) {
      setNotice('Tindakan admin berhasil, tetapi sebagian detail belum dapat dimuat ulang. Muat ulang halaman untuk melihat state terbaru.')
    }
    return refreshed
  }

  function openAction(action: Exclude<DialogAction, null>) {
    setDialog(action)
    setReason('')
    setInstructions(pickup?.instructions || '')
    setFormError(null)
    setFieldError(null)
    setPageError(null)
    setNotice(null)
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pickup || !dialog || submitting.current) return
    const cleanReason = reason.trim()
    if (!cleanReason) {
      setFieldError('Alasan wajib diisi.')
      return
    }
    if (cleanReason.length > 1000) {
      setFieldError('Alasan maksimal 1.000 karakter.')
      return
    }
    const cleanInstructions = instructions.trim()
    if (dialog === 'instructions' && cleanInstructions.length > 2000) {
      setFieldError('Instruksi maksimal 2.000 karakter.')
      return
    }

    submitting.current = true
    setBusy(true)
    setFormError(null)
    setFieldError(null)
    setPageError(null)
    setNotice(null)
    try {
      await bootstrapCsrf()
      let updated: AdminPickup
      if (dialog === 'instructions') {
        updated = await adminApi.updatePickup(pickup.id, {
          instructions: cleanInstructions || null,
          reason: cleanReason,
        }) as AdminPickup
      } else if (dialog === 'complete') {
        updated = await adminApi.completePickup(pickup.id, { reason: cleanReason }) as AdminPickup
      } else {
        updated = await adminApi.markPickupNoShow(pickup.id, { reason: cleanReason }) as AdminPickup
      }
      setDialog(null)
      const refreshed = await refreshAfterAction(updated)
      if (refreshed) setNotice(dialog === 'instructions'
        ? 'Instruksi pickup berhasil dikoreksi dan detail dimuat ulang.'
        : dialog === 'complete'
          ? 'Pickup berhasil dicatat selesai dan detail dimuat ulang.'
          : 'Pickup berhasil ditandai tidak hadir; reservation dibatalkan dan detail dimuat ulang.')
      else setPageError(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession()
      const message = adminPickupError(error, dialog)
      if (error instanceof ApiError && error.status === 409) {
        setDialog(null)
        setPageError(message)
        await reloadDetail(pickup)
        setPageError(message)
      } else {
        setFormError(message)
      }
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  if (auth.status === 'loading') return <section className="supply-container" role="status">Memuat akses admin…</section>
  if (auth.status !== 'authenticated' || !auth.user?.is_admin) {
    return <div className="supply-container"><Alert tone="danger" title="Akses admin diperlukan">Halaman moderasi pickup hanya untuk admin.</Alert></div>
  }
  if (loadedFor !== loadKey) return <section className="supply-container" role="status" aria-busy="true">Memuat detail pickup…</section>
  if (loadError || !pickup) return <main className="supply-container flex flex-col gap-4">
    <Link to="/admin/pickups">← Moderasi pickup</Link>
    <Alert tone="danger" title="Detail pickup belum dapat dimuat">{loadError || 'Pickup tidak ditemukan.'}</Alert>
    <Button variant="secondary" className="self-start" onClick={() => setAttempt(value => value + 1)}>Coba lagi</Button>
  </main>

  const snapshot = reservation ? acceptedSnapshot(reservation) : null
  const deadline = snapshot?.resource_deadline
  const deadlineTime = deadline ? Date.parse(deadline) : NaN
  const scheduledTime = Date.parse(pickup.scheduled_at)
  const beforeDeadline = now !== null && Number.isFinite(deadlineTime) && now < deadlineTime
  const isScheduled = pickup.status === 'SCHEDULED'
  const canEditInstructions = isScheduled && beforeDeadline
  const canComplete = isScheduled && beforeDeadline
  const canNoShow = isScheduled && beforeDeadline && now !== null && Number.isFinite(scheduledTime) && now > scheduledTime
  const timeline = adminPickupTimeline(pickup, reservation)
  const resourceType = snapshot?.resource_type

  return <main className="supply-container flex flex-col gap-6">
    <Link className="inline-flex min-h-11 items-center text-sm text-primary-hover" to="/admin/pickups">← Moderasi pickup</Link>
    <header className="flex flex-col gap-3">
      <h1 className="supply-heading">Moderasi pickup</h1>
      <p className="m-0 text-base text-muted">{adminPickupReference(pickup.id)} · RSV-{String(pickup.reservation_id).padStart(3, '0')} · {adminStatusLabel(pickup.status)}</p>
      <Badge status={pickup.status}>{adminStatusLabel(pickup.status)}</Badge>
    </header>

    <Alert tone="info" title="Moderasi admin"><p>Tindakan admin tetap tunduk pada aturan stok, deadline, dan status. Jadwal terminal tidak dapat diubah atau direset.</p></Alert>
    {pageError && <Alert tone="danger" title="Tindakan belum selesai">{pageError}</Alert>}
    {notice && <Alert tone="success" title="Perubahan berhasil">{notice}</Alert>}
    {reservationError && <Alert tone="warning" title="Data reservation belum tersedia">{reservationError}</Alert>}

    <div className="grid items-start gap-6 nav:grid-cols-2">
      <div className="order-2 flex min-w-0 flex-col gap-6 nav:order-1">
        {snapshot ? <AgreementSummary
          reference={`${resourceType ? supplyLabel(resourceType) : 'Resource'} · reservation ${reservation?.id}`}
          title={snapshot.title || 'Detail resource'}
          provider={reservation?.provider?.display_name || 'Provider'}
          receiver={reservation?.receiver?.display_name || 'Receiver'}
          quantity={snapshot.quantity != null ? quantityText(snapshot.quantity) : undefined}
          unit={snapshot.unit}
          sharingLabel={snapshot.mode ? supplyLabel(snapshot.mode) : undefined}
          deadline={formatAdminPickupDate(snapshot.resource_deadline)}
          location={[snapshot.location?.label, snapshot.location?.area].filter(Boolean).join(', ') || undefined}
          condition={snapshot.condition}
        /> : <section className="rounded-md border border-border bg-surface p-5"><h2 className="m-0 text-lg font-semibold">Peserta reservation</h2><dl className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 text-sm"><dt className="text-muted">Provider</dt><dd className="m-0">{reservation?.provider?.display_name || 'Tidak tersedia'}</dd><dt className="text-muted">Receiver</dt><dd className="m-0">{reservation?.receiver?.display_name || 'Tidak tersedia'}</dd><dt className="text-muted">Status reservation</dt><dd className="m-0">{reservation ? adminStatusLabel(reservation.status) : 'Tidak tersedia'}</dd></dl></section>}

        {reservation && <section className="rounded-md border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 text-lg font-semibold">Reservation terkait</h2><Badge status={reservation.status}>{adminStatusLabel(reservation.status)}</Badge></div>
          <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 text-sm">
            <dt className="text-muted">Provider</dt><dd className="m-0">{reservation.provider?.display_name || 'Tidak tersedia'}</dd>
            <dt className="text-muted">Receiver</dt><dd className="m-0">{reservation.receiver?.display_name || 'Tidak tersedia'}</dd>
            {reservation.provider?.whatsapp_number && <><dt className="text-muted">Kontak provider</dt><dd className="m-0">{reservation.provider.whatsapp_number}</dd></>}
            {reservation.receiver?.whatsapp_number && <><dt className="text-muted">Kontak receiver</dt><dd className="m-0">{reservation.receiver.whatsapp_number}</dd></>}
            <dt className="text-muted">Dibuat</dt><dd className="m-0">{formatAdminPickupDate(reservation.created_at)}</dd>
            <dt className="text-muted">Diterima</dt><dd className="m-0">{formatAdminPickupDate(reservation.accepted_at)}</dd>
            {reservation.reason && <><dt className="text-muted">Alasan reservation</dt><dd className="m-0 whitespace-pre-wrap">{reservation.reason}</dd></>}
          </dl>
        </section>}

      </div>

      <section className="order-1 flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:order-2 nav:p-6" aria-labelledby="admin-pickup-actions-heading">
        <h2 id="admin-pickup-actions-heading" className="m-0 text-xl font-bold leading-normal">Tindakan moderasi</h2>
        <p className="m-0 text-base text-muted">Semua tindakan dicatat dengan alasan untuk audit.</p>
        {!isScheduled && <Alert tone="info" title="Pickup sudah terminal">Jadwal terminal tidak dapat dibuka kembali, direset, atau diubah.</Alert>}
        {isScheduled && !beforeDeadline && <Alert tone="warning" title="Deadline resource terlewati">Tindakan pickup tidak tersedia setelah deadline.</Alert>}
        {canEditInstructions && <Button variant="secondary" onClick={() => openAction('instructions')}>Koreksi instruksi</Button>}
        {canComplete && <Button onClick={() => openAction('complete')}>Catat selesai</Button>}
        {canNoShow && <Button variant="destructive" onClick={() => openAction('no-show')}>Tandai tidak hadir</Button>}
        {isScheduled && beforeDeadline && !canNoShow && <p className="m-0 text-xs text-muted">No-show tersedia setelah waktu pickup terlewati.</p>}
        <p className="m-0 text-sm text-muted">Jadwal dan lokasi tidak dapat diubah dari detail pickup. Untuk jadwal baru, reservation harus dibatalkan melalui alur reservation.</p>
      </section>
    </div>

    <PickupStatus
      status={pickup.status}
      label={adminStatusLabel(pickup.status)}
      scheduledAt={formatAdminPickupDate(pickup.scheduled_at)}
      location={[pickup.location?.label, pickup.location?.area].filter(Boolean).join(', ') || 'Tidak tersedia'}
      instructions={pickup.instructions || 'Tidak ada instruksi tambahan.'}
    />
    <section className="rounded-md border border-border bg-surface p-4 nav:p-6">
      <h2 className="m-0 text-lg font-semibold">Riwayat pickup</h2>
      {timeline.length ? <ol className="mt-4 mb-0 flex flex-col gap-4 border-l border-border pl-5">
        {timeline.map((item, index) => <li key={`${item.label}-${item.at || index}`} className="pl-1">
          <p className="m-0 font-medium">{item.label}</p>
          <p className="m-0 text-sm text-muted">{formatAdminPickupDate(item.at)}</p>
          {item.reason && <p className="mt-1 mb-0 whitespace-pre-wrap text-sm">Alasan: {item.reason}</p>}
        </li>)}
      </ol> : <p className="mt-3 mb-0 text-sm text-muted">Riwayat timestamp belum disediakan oleh API.</p>}
      {pickup.updated_at && <p className="mt-4 mb-0 text-xs text-muted">Terakhir diperbarui {formatAdminPickupDate(pickup.updated_at)}</p>}
    </section>

    <Dialog
      open={dialog !== null}
      title={dialog === 'instructions' ? 'Koreksi instruksi pickup' : dialog === 'complete' ? 'Catat pickup selesai?' : 'Tandai pickup tidak hadir?'}
      onClose={busy ? undefined : () => setDialog(null)}
    >
      {formError && <div className="mb-4"><Alert tone="danger" title="Tindakan belum tersimpan">{formError}</Alert></div>}
      {dialog === 'complete' && <p className="m-0 mb-4">Tindakan ini mencatat pickup selesai berdasarkan moderasi admin. Ini bukan verifikasi pembayaran.</p>}
      {dialog === 'no-show' && <p className="m-0 mb-4">Tindakan ini membatalkan reservation dan melepas alokasi resource. Pickup terminal tidak dapat dibuka kembali.</p>}
      <form noValidate onSubmit={submitAction} className="flex flex-col gap-4">
        {dialog === 'instructions' && <FormField label="Instruksi pickup" hint={`${instructions.length}/2.000 karakter`}>
          <Textarea value={instructions} maxLength={2000} onChange={event => { setInstructions(event.target.value); setFieldError(null) }} rows={4} />
        </FormField>}
        <FormField label="Alasan admin" required hint={`${reason.length}/1.000 karakter`} error={fieldError || undefined}>
          <Textarea value={reason} maxLength={1000} onChange={event => { setReason(event.target.value); setFieldError(null); setFormError(null) }} rows={3} placeholder="Alasan tindakan untuk riwayat audit." />
        </FormField>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setDialog(null)}>Batal</Button>
          <Button type="submit" variant={dialog === 'no-show' ? 'destructive' : 'primary'} loading={busy}>{dialog === 'instructions' ? 'Simpan koreksi' : dialog === 'complete' ? 'Konfirmasi selesai' : 'Konfirmasi no-show'}</Button>
        </div>
      </form>
    </Dialog>
  </main>
}
