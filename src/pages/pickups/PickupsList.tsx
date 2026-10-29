import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Select from '../../components/ui/Select.tsx'
import { ApiError } from '../../services/api.ts'
import { pickupsApi, type PickupPage } from '../../services/pickups.ts'
import { jakartaDateTime, pickupStatusLabel, reservationReference } from './scheduleModel.ts'

function pickupReference(id: number | string) {
  const value = String(id)
  return `PICKUP-${/^\d+$/.test(value) ? value.padStart(3, '0') : value}`
}

const pageSize = '20'
const statusOptions = [
  { value: 'SCHEDULED', label: 'Terjadwal' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'NO_SHOW', label: 'Tidak hadir' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]
const roleOptions = [
  { value: 'provider', label: 'Provider' },
  { value: 'receiver', label: 'Receiver' },
]
const validStatuses = new Set(statusOptions.map(option => option.value))
const validRoles = new Set(roleOptions.map(option => option.value))

type Result = { key: string; data?: PickupPage; error?: unknown }

export default function PickupsList() {
  const [params, setParams] = useSearchParams()
  const auth = useAuth()
  const clearSession = auth.clearSession
  const rawPage = params.get('page') || '1'
  const page = /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage))
    ? Number(rawPage)
    : 1
  const rawStatus = params.get('status') || ''
  const rawRole = params.get('role') || ''
  const status = validStatuses.has(rawStatus) ? rawStatus : ''
  const role = validRoles.has(rawRole) ? rawRole : ''
  const query = new URLSearchParams({ page: String(page), page_size: pageSize })
  if (status) query.set('status', status)
  if (role) query.set('role', role)
  const key = query.toString()
  const [result, setResult] = useState<Result>({ key: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    pickupsApi.list(Object.fromEntries(new URLSearchParams(key)), { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) setResult({ key, data })
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ key, error })
      })
    return () => controller.abort()
  }, [key, attempt])

  const data = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  const pending = !data && error === undefined

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) clearSession()
  }, [error, clearSession])

  function updateFilter(name: 'status' | 'role', value: string) {
    const next = new URLSearchParams()
    if (name === 'status' ? value : status) next.set('status', name === 'status' ? value : status)
    if (name === 'role' ? value : role) next.set('role', name === 'role' ? value : role)
    next.set('page', '1')
    setParams(next)
  }

  function setPage(value: number) {
    const next = new URLSearchParams()
    if (status) next.set('status', status)
    if (role) next.set('role', role)
    next.set('page', String(value))
    setParams(next)
  }

  function retry() {
    setResult({ key })
    setAttempt(value => value + 1)
  }

  function resetPage() {
    setPage(1)
  }

  return (
    <section className="mx-auto flex w-full max-w-320 flex-col gap-6 px-6 py-8 nav:gap-7 nav:px-12 nav:py-12">
      <header className="flex flex-col gap-2">
        <p className="m-0 font-caption text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Pickup / Fulfillment
        </p>
        <h1 className="m-0 font-brand text-[28px] font-bold nav:text-[32px]">Pickup saya</h1>
        <p className="m-0 text-sm text-muted nav:text-base">
          Jadwal aktif dan riwayat pickup reservasi yang kamu ikuti.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 sm:max-w-160">
        <FormField label="Status pickup">
          <Select
            value={status}
            onChange={event => updateFilter('status', event.target.value)}
            placeholder="Semua status"
            options={statusOptions}
          />
        </FormField>
        <FormField label="Peran">
          <Select
            value={role}
            onChange={event => updateFilter('role', event.target.value)}
            placeholder="Semua peran"
            options={roleOptions}
          />
        </FormField>
      </div>

      <section aria-label="Daftar pickup" aria-busy={pending} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-semibold">Jadwal dan riwayat</h2>
          {data && <p className="m-0 text-sm text-muted">{data.count} pickup</p>}
        </div>

        {pending && <p className="m-0" role="status">Memuat pickup…</p>}

        {error !== undefined && (
          <PageState error title="Daftar pickup belum dapat dimuat">
            {error instanceof ApiError && error.status === 404
              ? 'Halaman tidak ditemukan. Kembali ke halaman pertama untuk melihat riwayat pickup.'
              : error instanceof ApiError && error.status === 400
                ? 'Filter pickup tidak valid. Atur ulang filter untuk melanjutkan.'
                : 'Periksa koneksi lalu coba lagi.'}
            <div className="mt-4 flex flex-wrap gap-3">
              {page > 1 && (
                <Button variant="secondary" onClick={resetPage}>Halaman pertama</Button>
              )}
              <Button onClick={retry}>Coba lagi</Button>
            </div>
          </PageState>
        )}

        {data && data.results.length === 0 && (
          <PageState title={status || role ? 'Tidak ada pickup yang cocok' : 'Belum ada pickup'}>
            {status || role
              ? 'Coba ubah filter status atau peran untuk melihat riwayat lain.'
              : 'Pickup yang sudah dijadwalkan akan muncul di sini.'}
          </PageState>
        )}

        {data && data.results.length > 0 && (
          <>
            <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {data.results.map(pickup => (
                <li key={pickup.id} className="min-w-0">
                  <article className="flex h-full flex-col items-start gap-4 rounded-md border border-border bg-surface p-5">
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-muted">{reservationReference(pickup.reservation_id)}</span>
                      <Badge status={pickup.status}>{pickupStatusLabel(pickup.status)}</Badge>
                    </div>
                    <h3 className="m-0 text-lg font-semibold">
                      {pickupReference(pickup.id)}
                    </h3>
                    <dl className="m-0 grid gap-3 text-sm">
                      <div>
                        <dt className="text-muted">Waktu pickup</dt>
                        <dd className="m-0 font-medium">{jakartaDateTime(pickup.scheduled_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Lokasi</dt>
                        <dd className="m-0 font-medium">{pickup.location.label}, {pickup.location.area}</dd>
                      </div>
                    </dl>
                    <Link
                      className="fr-button mt-auto self-stretch"
                      to={`/pickups/${encodeURIComponent(String(pickup.id))}`}
                    >
                      Lihat detail pickup
                    </Link>
                  </article>
                </li>
              ))}
            </ul>

            <nav aria-label="Halaman pickup" className="mt-2 flex flex-wrap items-center justify-center gap-4">
              <Button variant="secondary" disabled={!data.previous} onClick={() => setPage(page - 1)}>
                Sebelumnya
              </Button>
              <span aria-current="page">Halaman {page}</span>
              <Button variant="secondary" disabled={!data.next} onClick={() => setPage(page + 1)}>
                Berikutnya
              </Button>
            </nav>
          </>
        )}
      </section>
    </section>
  )
}
