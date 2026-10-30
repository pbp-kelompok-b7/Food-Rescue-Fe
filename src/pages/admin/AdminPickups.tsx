import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { bootstrapCsrf } from '../../services/auth.ts'
import { adminApi } from '../../services/admin.ts'
import { jakartaInputToTimestamp, jakartaNowInput, validatePickupSchedule } from '../pickups/scheduleModel.ts'
import {
  acceptedSnapshot,
  adminPickupError,
  adminPickupReference,
  adminStatusLabel,
  canAdminSchedule,
  formatAdminPickupDate,
  type AdminPickupPage,
  type AdminReservation,
} from './pickupsModel.ts'

const pageSize = 20
const statusOptions = [
  { value: 'SCHEDULED', label: 'Terjadwal' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'NO_SHOW', label: 'Tidak hadir' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

export default function AdminPickups() {
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [params, setParams] = useSearchParams()
  const pageValue = params.get('page') || '1'
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) ? Number(pageValue) : 1
  const status = params.get('status') || ''
  const reservationFilter = params.get('reservation_id') || ''
  const filterKey = `${status}\u0000${reservationFilter}`
  const [filterState, setFilterState] = useState({ key: filterKey, value: { status, reservation_id: reservationFilter } })
  const filters = filterState.key === filterKey ? filterState.value : { status, reservation_id: reservationFilter }
  const [filterError, setFilterError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: AdminPickupPage; error?: unknown }>({ key: '' })
  const [reservationId, setReservationId] = useState('')
  const [lookupAttempt, setLookupAttempt] = useState<AdminReservation | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [instructions, setInstructions] = useState('')
  const [reason, setReason] = useState('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleFieldErrors, setScheduleFieldErrors] = useState<Record<string, string>>({})
  const [scheduling, setScheduling] = useState(false)
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null)
  const submitting = useRef(false)

  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) query.set('status', status)
  if (reservationFilter) query.set('reservation_id', reservationFilter)
  const key = query.toString()
  function updateFilters(update: (current: typeof filters) => typeof filters) {
    setFilterState(current => {
      const base = current.key === filterKey ? current.value : { status, reservation_id: reservationFilter }
      return { key: filterKey, value: update(base) }
    })
  }
  useEffect(() => {
    let active = true
    const requestQuery = Object.fromEntries(new URLSearchParams(key)) as Record<string, string>
    adminApi.listPickups(requestQuery).then(value => {
      if (active) setResult({ key, data: value as AdminPickupPage })
    }).catch(error => {
      if (active) setResult({ key, error })
      if (active && error instanceof ApiError && error.status === 401) clearSession()
    })
    return () => { active = false }
  }, [key, attempt, clearSession])

  const data = result.key === key ? result.data : undefined
  const loadError = result.key === key ? result.error : undefined
  const pending = !data && loadError === undefined

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedId = filters.reservation_id.trim()
    if (normalizedId && !/^[1-9]\d*$/.test(normalizedId)) {
      setFilterError('ID reservation harus berupa bilangan bulat positif.')
      return
    }
    setFilterError(null)
    const next = new URLSearchParams()
    next.set('page', '1')
    if (filters.status) next.set('status', filters.status)
    if (normalizedId) next.set('reservation_id', normalizedId)
    setParams(next)
  }

  async function lookupReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = reservationId.trim()
    if (!/^[1-9]\d*$/.test(id)) {
      setLookupAttempt(null)
      setLookupError('Masukkan ID reservation berupa bilangan bulat positif.')
      return
    }
    setLookupLoading(true)
    setLookupError(null)
    setLookupAttempt(null)
    setScheduleNotice(null)
    try {
      const reservation = await adminApi.getReservation(id) as AdminReservation
      setLookupAttempt(reservation)
      setScheduledAt(jakartaNowInput())
      setInstructions('')
      setReason('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession()
      setLookupError(adminPickupError(error, 'schedule'))
    } finally {
      setLookupLoading(false)
    }
  }

  async function schedulePickup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lookupAttempt || !canAdminSchedule(lookupAttempt) || submitting.current) return
    const snapshot = acceptedSnapshot(lookupAttempt)
    const fieldErrors = validatePickupSchedule(scheduledAt, instructions, snapshot?.resource_deadline)
    const cleanReason = reason.trim()
    if (!cleanReason) fieldErrors.reason = 'Alasan wajib diisi.'
    else if (cleanReason.length > 1000) fieldErrors.reason = 'Alasan maksimal 1.000 karakter.'
    setScheduleFieldErrors(fieldErrors)
    if (Object.keys(fieldErrors).length) return

    submitting.current = true
    setScheduling(true)
    setScheduleError(null)
    setScheduleNotice(null)
    try {
      const scheduledTimestamp = jakartaInputToTimestamp(scheduledAt)
      if (!scheduledTimestamp) throw new Error('Jadwal pickup tidak valid.')
      await bootstrapCsrf()
      await adminApi.schedulePickup(lookupAttempt.id, {
        scheduled_at: scheduledTimestamp,
        instructions: instructions.trim() || null,
        reason: cleanReason,
      })
      setLookupAttempt(null)
      setReservationId('')
      setScheduleNotice('Pickup berhasil dijadwalkan. Daftar pickup dimuat ulang.')
      setAttempt(value => value + 1)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearSession()
      setScheduleError(error instanceof Error && !(error instanceof ApiError)
        ? error.message
        : adminPickupError(error, 'schedule'))
      if (error instanceof ApiError && error.status === 409) setAttempt(value => value + 1)
    } finally {
      submitting.current = false
      setScheduling(false)
    }
  }

  if (auth.status === 'loading') return <section className="supply-container" role="status">Memuat akses admin…</section>
  if (auth.status !== 'authenticated' || !auth.user?.is_admin) {
    return <div className="supply-container"><PageState error title="Akses admin diperlukan">Halaman moderasi pickup hanya untuk admin.</PageState></div>
  }

  const currentPage = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1

  return <main className="supply-container flex flex-col gap-6">
    <header className="flex flex-col gap-2">
      <p className="supply-caption">ADMIN / MODERASI PICKUP</p>
      <h1 className="supply-heading">Moderasi pickup</h1>
      <p className="m-0 text-sm text-muted nav:text-base">Tinjau histori pickup dan bantu jadwalkan handoff untuk reservation yang sudah diterima.</p>
    </header>

    {scheduleNotice && <Alert tone="success" title="Jadwal pickup tersimpan">{scheduleNotice}</Alert>}

    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:p-6" aria-labelledby="schedule-pickup-heading">
      <div>
        <h2 id="schedule-pickup-heading" className="m-0 text-xl font-semibold">Jadwalkan pickup</h2>
        <p className="mt-1 mb-0 text-sm text-muted">Masukkan ID reservation ACCEPTED yang belum memiliki pickup. Lokasi mengikuti snapshot kesepakatan.</p>
      </div>
      {lookupError && <Alert tone="danger" title="Reservation belum dapat dimuat">{lookupError}</Alert>}
      <form onSubmit={lookupReservation} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField label="ID reservation">
          <Input inputMode="numeric" value={reservationId} onChange={event => setReservationId(event.target.value)} placeholder="Contoh: 123" />
        </FormField>
        <Button type="submit" loading={lookupLoading}>Periksa reservation</Button>
      </form>

      {lookupAttempt && (() => {
        const snapshot = acceptedSnapshot(lookupAttempt)
        const eligible = canAdminSchedule(lookupAttempt)
        return <div className="flex flex-col gap-4 rounded-md bg-canvas p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="m-0 font-semibold">RSV-{String(lookupAttempt.id).padStart(3, '0')}</h3>
              <p className="m-0 text-sm text-muted">{lookupAttempt.provider?.display_name || 'Provider'} · {lookupAttempt.receiver?.display_name || 'Receiver'}</p>
            </div>
            <Badge status={lookupAttempt.status}>{adminStatusLabel(lookupAttempt.status)}</Badge>
          </div>
          {snapshot && <dl className="m-0 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Resource</dt><dd className="m-0 font-medium">{snapshot.title || 'Resource'}</dd></div>
            <div><dt className="text-muted">Batas resource</dt><dd className="m-0 font-medium">{formatAdminPickupDate(snapshot.resource_deadline)}</dd></div>
            <div><dt className="text-muted">Lokasi snapshot</dt><dd className="m-0 font-medium">{[snapshot.location?.label, snapshot.location?.area].filter(Boolean).join(', ') || 'Tidak tersedia'}</dd></div>
          </dl>}
          {!eligible ? <Alert tone="warning" title="Reservation belum memenuhi syarat">
            {lookupAttempt.status !== 'ACCEPTED'
              ? 'Penjadwalan hanya tersedia untuk reservation ACCEPTED.'
              : 'Reservation ini sudah memiliki pickup. Jadwal tidak dapat dibuat ulang.'}
          </Alert> : <form noValidate onSubmit={schedulePickup} className="flex flex-col gap-4 border-t border-border pt-4">
            {scheduleError && <Alert tone="danger" title="Pickup belum dijadwalkan">{scheduleError}</Alert>}
            <FormField label="Waktu pickup (WIB)" required error={scheduleFieldErrors.scheduled_at}>
              <Input type="datetime-local" value={scheduledAt} onChange={event => { setScheduledAt(event.target.value); setScheduleFieldErrors(current => ({ ...current, scheduled_at: '' })) }} />
            </FormField>
            <FormField label="Instruksi pickup" hint={`${instructions.length}/2.000 karakter`} error={scheduleFieldErrors.instructions}>
              <Textarea value={instructions} maxLength={2000} onChange={event => { setInstructions(event.target.value); setScheduleFieldErrors(current => ({ ...current, instructions: '' })) }} rows={3} placeholder="Instruksi handoff untuk peserta (opsional)." />
            </FormField>
            <FormField label="Alasan penjadwalan admin" required hint={`${reason.length}/1.000 karakter`} error={scheduleFieldErrors.reason}>
              <Textarea value={reason} maxLength={1000} onChange={event => { setReason(event.target.value); setScheduleFieldErrors(current => ({ ...current, reason: '' })) }} rows={3} placeholder="Catat alasan admin menjadwalkan pickup." />
            </FormField>
            <Button type="submit" loading={scheduling}>Jadwalkan pickup</Button>
          </form>}
        </div>
      })()}
    </section>

    <section className="flex flex-col gap-4" aria-label="Daftar pickup" aria-busy={pending}>
      <div>
        <h2 className="m-0 text-xl font-semibold">Pickup dan histori</h2>
        {data && <p className="mt-1 mb-0 text-sm text-muted">{data.count} pickup</p>}
      </div>
      <form onSubmit={applyFilters} className="grid items-end gap-3 sm:grid-cols-2 nav:grid-cols-4">
        <FormField label="Status">
          <Select value={filters.status} onChange={event => updateFilters(current => ({ ...current, status: event.target.value }))} placeholder="Semua status" options={statusOptions} />
        </FormField>
        <FormField label="ID reservation">
          <Input inputMode="numeric" value={filters.reservation_id} onChange={event => updateFilters(current => ({ ...current, reservation_id: event.target.value }))} placeholder="Semua reservation" />
        </FormField>
        <Button type="submit">Terapkan</Button>
        <Button type="button" variant="secondary" onClick={() => { setFilterState({ key: filterKey, value: { status: '', reservation_id: '' } }); setFilterError(null); setParams({ page: '1' }) }}>Reset</Button>
      </form>
      {filterError && <Alert tone="danger" title="Filter tidak valid">{filterError}</Alert>}
      {pending && <p className="m-0" role="status" aria-busy="true">Memuat daftar pickup…</p>}
      {loadError !== undefined && <PageState error title="Daftar pickup belum dapat dimuat" action={<Button onClick={() => { setResult({ key }); setAttempt(value => value + 1) }}>Coba lagi</Button>}>{adminPickupError(loadError, 'list')}</PageState>}
      {data && (data.results.length === 0
        ? <PageState title="Belum ada pickup">Pickup yang cocok dengan filter ini akan muncul di sini.</PageState>
        : <>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {data.results.map(pickup => <article key={pickup.id} className="flex min-w-0 flex-col items-start gap-3 rounded-md border border-border bg-surface wrap-anywhere p-5 [&_h2]:m-0 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-semibold [&_p]:m-0">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-sm text-muted">{adminPickupReference(pickup.id)} · RSV-{String(pickup.reservation_id).padStart(3, '0')}</p>
                <Badge status={pickup.status}>{adminStatusLabel(pickup.status)}</Badge>
              </div>
              <h2>{formatAdminPickupDate(pickup.scheduled_at)}</h2>
              <p>{[pickup.location?.label, pickup.location?.area].filter(Boolean).join(', ') || 'Lokasi tidak tersedia'}</p>
              <Link className="fr-button mt-2" to={`/admin/pickups/${encodeURIComponent(String(pickup.id))}`}>Buka detail dan histori</Link>
            </article>)}
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="Halaman pickup">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set('page', String(page - 1)); return next })}>Sebelumnya</Button>
            <span aria-current="page">Halaman {page} dari {currentPage}</span>
            <Button variant="secondary" disabled={!data.next} onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set('page', String(page + 1)); return next })}>Berikutnya</Button>
          </nav>
        </>) }
    </section>
  </main>
}
