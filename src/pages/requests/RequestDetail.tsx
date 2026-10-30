import LocationMap from '../../components/location/LocationMap.tsx'
import { photoUrl } from '../../services/photos.ts'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import Alert from '../../components/ui/Alert.tsx'
import { ApiError } from '../../services/api.ts'
import { requestsApi, type ResourceRequest } from '../../services/requests.ts'
import { acceptingOffers, budgetText, deadlineText, quantityText, requestError, requestLabel } from './model.ts'
import RequestActions from './RequestActions.tsx'

export default function RequestDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const auth = useAuth()
  const reference = useReferenceData()
  // Previously permitted private details must disappear when the viewer changes.
  const key = `${id}:${auth.status}:${auth.user?.id || ''}`
  const [result, setResult] = useState<{ key: string; data?: ResourceRequest; error?: unknown }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState('')
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
    const refresh = () => { if (document.visibilityState !== 'hidden' && !document.querySelector('dialog[open]')) retry() }
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
    const timer = setTimeout(() => { if (document.querySelector('dialog[open]')) setAttempt(value => value + 1); else retry() }, Math.min(remaining + 50, 2_147_483_647))
    return () => clearTimeout(timer)
  }, [request, retry])
  if (error !== undefined) return <PageState error title={error instanceof ApiError && error.status === 404 ? 'Request tidak ditemukan' : 'Request belum dapat dibuka'} action={<div className="flex flex-wrap gap-3"><Button onClick={retry}>Coba lagi</Button><Link className="fr-button" to="/requests">Kembali ke Request Board</Link></div>}>{requestError(error)}</PageState>
  if (!request) return <p role="status">Memuat detail kebutuhan…</p>
  const category = reference.data?.categories.find(item => item.code === request.category)?.label || requestLabel(request.category)
  const owner = auth.status === 'authenticated' && String(auth.user?.id) === String(request.owner.id)
  const offerTo = `/requests/${request.id}/offer`
  const offerAction = owner ? <p className="m-0 text-sm text-muted">Ini request milikmu. Kamu tidak dapat menawarkan resource ke request sendiri.</p> : !acceptingOffers(request) ? <><Button disabled className="w-full">Request tidak menerima penawaran</Button><p className="m-0 text-sm text-muted">Periksa status, sisa kebutuhan, dan batas waktu request.</p></> : auth.status === 'loading' ? <Button disabled className="w-full">Memeriksa sesi…</Button> : auth.status === 'error' ? <Button variant="secondary" onClick={() => auth.refresh()}>Periksa sesi lagi</Button> : <Link className="fr-button w-full" to={auth.status === 'anonymous' ? '/login' : offerTo} state={auth.status === 'anonymous' ? { from: offerTo } : undefined}>Tawarkan resource</Link>
  const editAction = (owner || (auth.status === 'authenticated' && auth.user?.is_admin)) && <Link className="fr-button w-full" to={`/requests/${request.id}/edit`}>Edit request</Link>
  return <article className="request-detail wrap-anywhere">
    {notice && <Alert tone="success" title={notice} />}
    {location.state?.requestSaved && <Alert tone="success" title={location.state.requestSaved === 'created' ? 'Request berhasil diterbitkan.' : 'Perubahan request berhasil disimpan.'} />}
    <header className="flex flex-col gap-2 nav:gap-3"><p className="request-caption">REQUEST / DETAIL</p><h1 className="request-heading">{`Kebutuhan ${category}`}</h1><div className="flex flex-wrap gap-2"><Badge tone="success">{request.donate_only ? 'DONASI' : 'TERIMA PENAWARAN'}</Badge><Badge status={request.status}>{request.status}</Badge>{request.archived_at && <Badge>Diarsipkan</Badge>}</div></header>
    <div className="request-detail-columns">
      <div className="min-w-0">
        {request.image ? <img src={photoUrl(request.image)} alt="Foto resource" className="max-h-110 w-full rounded-xl object-contain bg-supply-container" /> : <section className="request-illustration" aria-label={`Ilustrasi kebutuhan ${category}`}><h2>{category}</h2><div className="request-illustration-body"><span className="flex items-center justify-center rounded-full bg-surface"><img src="/assets/figma/supply-image.svg" alt="" /></span><h3 className="m-0 text-lg font-semibold">Kebutuhan komunitas</h3><p>{`Resource untuk ${requestLabel(request.intended_use).toLowerCase()}.`}</p></div></section>}
        <LocationMap location={request.location} />
        <section className="request-detail-copy"><h2>Sisa {quantityText(request.quantity_remaining)} {request.unit} dibutuhkan</h2><p>Untuk {requestLabel(request.intended_use).toLowerCase()}</p><div className="my-4 flex flex-col gap-6 nav:hidden">{offerAction}{editAction}<p className="rounded-md bg-supply-container p-5 text-xs!">Provider memilih lokasi resource saat menawarkan.</p></div></section>
        <section className="request-detail-facts"><h2>Jumlah &amp; preferensi</h2><p className="m-0 text-sm">Terima tawaran · {deadlineText(request.valid_until)}</p><p className="m-0 text-sm">{budgetText(request)} · {requestLabel(request.intended_use)}</p><Badge tone="success">{requestLabel(request.resource_type).toUpperCase()}</Badge><details><summary className="cursor-pointer text-sm">Rincian kebutuhan</summary><dl className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-sm"><dt>Total dibutuhkan</dt><dd className="m-0">{quantityText(request.quantity_needed)} {request.unit}</dd><dt>Dialokasikan</dt><dd className="m-0">{quantityText(request.quantity_allocated)} {request.unit}</dd><dt>Sudah terpenuhi</dt><dd className="m-0">{quantityText(request.quantity_fulfilled)} {request.unit}</dd><dt>Pemilik</dt><dd className="m-0">{request.owner.display_name}</dd></dl><p className="m-0 text-xs text-muted">Alokasi belum selesai diambil; terpenuhi sudah diterima. Kontak tersedia setelah penawaran diterima.</p></details></section>
      </div>
      <aside className="request-offer-panel max-nav:hidden"><h2>Tawarkan resource</h2><p>Provider menentukan lokasi resource saat menawarkan.</p><section className="request-remaining"><h3>Sisa kebutuhan</h3><p>{quantityText(request.quantity_remaining)} {request.unit} dari {quantityText(request.quantity_needed)} {request.unit}</p></section><section className="flex flex-col gap-2"><h3 className="m-0 text-sm font-semibold">Area kebutuhan</h3><p className="text-ink!">{request.location.area}</p><p className="text-xs!">Lokasi resource dipilih provider sebelum persetujuan.</p></section><div className="mt-4 flex flex-col gap-3">{offerAction}{editAction}</div><p className="text-xs!">Pickup dijadwalkan setelah tawaran diterima.</p></aside>
    </div>
    <RequestActions request={request} onChanged={message => { setNotice(message); if (message) retry(); else setAttempt(value => value + 1) }} />
    <div className="flex flex-wrap items-center justify-between gap-3"><Link className="inline-flex min-h-11 items-center text-sm" to="/requests">← Kembali ke Request Board</Link><Button variant="ghost" onClick={retry}>Perbarui status</Button></div>
  </article>
}
