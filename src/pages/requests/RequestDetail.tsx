import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import { ApiError } from '../../services/api.ts'
import { requestsApi, type ResourceRequest } from '../../services/requests.ts'
import { acceptingOffers, budgetText, deadlineText, quantityText, requestError, requestLabel } from './model.ts'

export default function RequestDetail() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const reference = useReferenceData()
  // Previously permitted private details must disappear when the viewer changes.
  const key = `${id}:${auth.status}:${auth.user?.id || ''}`
  const [result, setResult] = useState<{ key: string; data?: ResourceRequest; error?: unknown }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => { setResult({ key }); setAttempt(value => value + 1) }, [key])
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => requestsApi.detail(id, { signal: controller.signal })).then(data => {
      if (!controller.signal.aborted) setResult({ key, data })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, error })
    })
    return () => controller.abort()
  }, [id, key, attempt])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== 'hidden') retry() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [retry])
  const request = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  useEffect(() => {
    if (!request) return
    const remaining = Date.parse(request.valid_until) - Date.now()
    if (remaining <= 0 || !Number.isFinite(remaining)) return
    // Re-read the server at this request's deadline; no background expiry writes.
    const timer = setTimeout(retry, Math.min(remaining + 50, 2_147_483_647))
    return () => clearTimeout(timer)
  }, [request, retry])
  if (error !== undefined) return <PageState error title={error instanceof ApiError && error.status === 404 ? 'Request tidak ditemukan' : 'Request belum dapat dibuka'} action={<div className="flex flex-wrap gap-3"><Button onClick={retry}>Coba lagi</Button><Link className="fr-button" to="/requests">Kembali ke Request Board</Link></div>}>{requestError(error)}</PageState>
  if (!request) return <p role="status">Memuat detail kebutuhan…</p>
  const category = reference.data?.categories.find(item => item.code === request.category)?.label || requestLabel(request.category)
  const owner = auth.status === 'authenticated' && String(auth.user?.id) === String(request.owner.id)
  const offerTo = `/requests/${request.id}/offer`
  const offerAction = owner ? <p className="m-0 text-sm text-muted">Ini request milikmu. Kamu tidak dapat menawarkan resource ke request sendiri.</p> : !acceptingOffers(request) ? <><Button disabled className="w-full">Request tidak menerima penawaran</Button><p className="m-0 text-sm text-muted">Periksa status, sisa kebutuhan, dan batas waktu request.</p></> : auth.status === 'loading' ? <Button disabled className="w-full">Memeriksa sesi…</Button> : auth.status === 'error' ? <Button variant="secondary" onClick={() => auth.refresh()}>Periksa sesi lagi</Button> : <Link className="fr-button w-full" to={auth.status === 'anonymous' ? '/login' : offerTo} state={auth.status === 'anonymous' ? { from: offerTo } : undefined}>Tawarkan resource</Link>
  return <article className="flex flex-col gap-6 wrap-anywhere">
    <Link className="inline-flex min-h-11 items-center self-start text-sm" to="/requests">← Kembali ke Request Board</Link>
    <header className="flex flex-col gap-3"><p className="m-0 text-xs font-semibold text-primary">REQUEST BOARD / DETAIL</p><h1 className="m-0 font-brand text-2xl font-semibold text-primary nav:text-[32px]">Kebutuhan {category}</h1><div className="flex flex-wrap gap-2"><Badge status={request.status}>{requestLabel(request.status)}</Badge>{request.archived_at && <Badge>Diarsipkan</Badge>}<Badge tone={request.resource_type === 'COMPOSTABLE_FOOD_WASTE' ? 'neutral' : 'warning'}>{requestLabel(request.resource_type)}</Badge></div></header>
    <div className="grid items-start gap-6 nav:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="rounded-xl bg-primary-container p-6"><h2 className="text-lg">Sisa kebutuhan</h2><p className="m-0 text-3xl font-bold text-primary">{quantityText(request.quantity_remaining)} {request.unit}</p><p className="mt-2 mb-0 text-sm text-muted">Untuk {requestLabel(request.intended_use).toLowerCase()}</p></section>
        <section className="rounded-xl bg-surface p-5"><h2 className="text-lg">Rincian kebutuhan</h2><dl className="m-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-sm"><dt>Total dibutuhkan</dt><dd className="m-0 font-semibold">{quantityText(request.quantity_needed)} {request.unit}</dd><dt>Dialokasikan</dt><dd className="m-0 font-semibold">{quantityText(request.quantity_allocated)} {request.unit}</dd><dt>Sudah terpenuhi</dt><dd className="m-0 font-semibold">{quantityText(request.quantity_fulfilled)} {request.unit}</dd></dl><p className="mt-4 mb-0 text-xs text-muted">Alokasi adalah jumlah yang telah disepakati dan belum selesai diambil. Terpenuhi adalah jumlah yang sudah diterima.</p></section>
        <section className="rounded-xl bg-surface p-5"><h2 className="text-lg">Informasi request</h2><dl className="m-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 text-sm"><dt>Kategori</dt><dd className="m-0">{category}</dd><dt>Peruntukan</dt><dd className="m-0">{requestLabel(request.intended_use)}</dd><dt>Pemilik</dt><dd className="m-0">{request.owner.display_name}</dd><dt>Area kebutuhan</dt><dd className="m-0">{request.location.area}</dd><dt>Terima penawaran sampai</dt><dd className="m-0">{deadlineText(request.valid_until)}</dd></dl></section>
      </div>
      <aside className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5 nav:sticky nav:top-6"><h2 className="m-0 text-xl">Bantu penuhi kebutuhan</h2><p className="m-0 text-sm">{budgetText(request)}</p><p className="m-0 text-sm text-muted">Tawarkan resource langsung tanpa membuat listing publik. Pemilik request akan meninjau penawaranmu.</p>{offerAction}<Button variant="secondary" onClick={retry}>Perbarui status</Button><p className="m-0 text-xs text-muted">Kontak hanya tersedia melalui detail reservasi setelah penawaran diterima.</p></aside>
    </div>
  </article>
}
