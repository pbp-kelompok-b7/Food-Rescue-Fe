import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import { ApiError } from '../../services/api.ts'
import { reservationsApi } from '../../services/reservations.ts'
import type { ReservationForPickup } from '../pickups/scheduleModel.ts'
import { jakartaDateTime } from '../pickups/scheduleModel.ts'

export default function ReservationDetail() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [data, setData] = useState<ReservationForPickup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    reservationsApi.detail(id, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setData(value as ReservationForPickup)
    }).catch(failure => {
      if (controller.signal.aborted) return
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      setError(failure instanceof ApiError && failure.status === 404 ? 'Reservation tidak ditemukan atau tidak dapat diakses.' : 'Detail reservation belum dapat dimuat.')
    })
    return () => controller.abort()
  }, [id, attempt, clearSession])

  if (error) return <section className="mx-auto flex w-full max-w-180 flex-col gap-4"><Link to="/reservations">← Kembali ke reservation</Link><Alert tone="danger" title="Gagal memuat reservation">{error}</Alert><Button variant="secondary" onClick={() => { setError(null); setAttempt(value => value + 1) }}>Coba lagi</Button></section>
  if (!data) return <section className="mx-auto w-full max-w-180" role="status" aria-busy="true">Memuat reservation…</section>
  const provider = data.provider?.id === auth.user?.id
  const snapshot = data.accepted_snapshot
  const canSchedule = provider && data.status === 'ACCEPTED' && !data.pickup

  return <article className="mx-auto flex w-full max-w-180 flex-col gap-6">
    <Link className="inline-flex min-h-11 items-center text-sm" to="/reservations">← Kembali ke reservation</Link>
    <header><p className="m-0 font-caption text-xs text-primary">RESERVATION / DETAIL</p><h1 className="mb-2 mt-2 font-brand text-[28px] font-semibold">{snapshot?.title || 'Reservation'}</h1><p className="m-0 text-sm text-muted">Reservation #{data.id} · {data.status.replaceAll('_', ' ')}</p></header>
    {data.status === 'ACCEPTED' && <section className="rounded-xl bg-surface p-5"><h2 className="m-0 mb-4 text-lg font-semibold">Kesepakatan diterima</h2>{snapshot ? <dl className="m-0 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-4 gap-y-3 text-sm"><dt className="text-muted">Lokasi</dt><dd className="m-0">{snapshot.location?.label || 'Tidak tersedia'}{snapshot.location?.area ? ` · ${snapshot.location.area}` : ''}</dd><dt className="text-muted">Batas resource</dt><dd className="m-0">{jakartaDateTime(snapshot.resource_deadline)}</dd></dl> : <p className="m-0 text-sm text-muted">Detail snapshot belum tersedia.</p>}</section>}
    {canSchedule && <Alert title="Langkah berikutnya">Provider dapat menjadwalkan pickup setelah kedua pihak melengkapi WhatsApp.</Alert>}
    {canSchedule && <Link className="fr-button self-start" to={`/reservations/${encodeURIComponent(data.id)}/pickup`}>Jadwalkan pickup</Link>}
    {data.pickup && <section className="rounded-xl bg-surface p-5"><h2 className="m-0 mb-3 text-lg font-semibold">Pickup sudah dijadwalkan</h2><p className="mb-4 mt-0 text-sm">{data.pickup.id ? 'Jadwal pickup telah dibuat.' : ''}</p><Link className="fr-button" to={`/pickups/${encodeURIComponent(data.pickup.id)}`}>Buka detail pickup</Link></section>}
    {data.status !== 'ACCEPTED' && <Alert tone="info" title="Pickup belum tersedia">Form penjadwalan hanya dibuka untuk reservation berstatus ACCEPTED.</Alert>}
  </article>
}
