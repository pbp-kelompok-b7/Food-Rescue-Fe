import AreaAutocomplete from '../../components/location/AreaAutocomplete.tsx'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import FilterSheet from '../../components/resources/FilterSheet.tsx'
import RequestCard from '../../components/resources/RequestCard.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import { suitabilityOptions } from '../../components/resources/resourceFields.ts'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import { ApiError } from '../../services/api.ts'
import RequestActions from './RequestActions.tsx'
import { requestsApi, type RequestPage } from '../../services/requests.ts'
import { budgetSummary, deadlineText, quantityText, requestError, requestLabel } from './model.ts'

type Filters = Record<'resource_type' | 'category' | 'intended_use' | 'donate_only', string>
const blankFilters: Filters = { resource_type: '', category: '', intended_use: '', donate_only: '' }
const orders = [
  { value: '-created_at', label: 'Terbaru' }, { value: 'created_at', label: 'Terlama' },
  { value: 'valid_until', label: 'Batas waktu terdekat' }, { value: '-valid_until', label: 'Batas waktu terjauh' },
]

export default function BrowseRequests({ mine = false }: { mine?: boolean }) {
  const [params, setParams] = useSearchParams()
  const auth = useAuth()
  const location = useLocation()
  const reference = useReferenceData()
  const q = params.get('q') || ''
  const area = params.get('area') || ''
  const pageValue = params.get('page') || '1'
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) ? Number(pageValue) : 1
  const ordering = params.get('ordering') || '-created_at'
  const status = mine ? params.get('status') || '' : ''
  const statuses = ['OPEN', 'ALLOCATED', 'FULFILLED', 'CLOSED', 'EXPIRED']
  const active = Object.fromEntries(Object.keys(blankFilters).map(key => [key, params.get(key) || ''])) as Filters
  const [filters, setFilters] = useState(active)
  const [filterArea, setFilterArea] = useState(area)
  const [sheet, setSheet] = useState(false)
  const [searchError, setSearchError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<string>(location.state?.requestNotice || '')
  const [result, setResult] = useState<{ key: string; data?: RequestPage; error?: unknown }>({ key: '' })
  const recoverPageAfterWrite = useRef(false)
  // Public browsing cannot be changed into private history by incoming URL fields.
  const query = new URLSearchParams({ page: String(page), page_size: '20', ordering })
  if (mine) query.set('scope', 'mine')
  if (status) query.set('status', status)
  if (q) query.set('q', q)
  if (area) query.set('area', area)
  Object.entries(active).forEach(([name, value]) => { if (value) query.set(name, value) })
  const apiKey = query.toString()
  const key = mine ? `${apiKey}:${auth.status}:${auth.user?.id || ''}` : apiKey
  const readable = !mine || auth.status === 'authenticated'
  const [filterKey, setFilterKey] = useState(key)
  if (filterKey !== key) { setFilterKey(key); setFilters(active); setFilterArea(area) }
  const invalidQuery = Boolean((q && (q.trim().length < 2 || q.length > 100)) || area.length > 100 || (area && !area.trim()) || !orders.some(option => option.value === ordering) || pageValue !== String(page) || (status && !statuses.includes(status)))
  useEffect(() => {
    const controller = new AbortController()
    if (!invalidQuery && readable) requestsApi.list(Object.fromEntries(new URLSearchParams(apiKey)), { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { recoverPageAfterWrite.current = false; setResult({ key, data }) }
    }).catch(error => {
      if (controller.signal.aborted) return
      const recover = mine && recoverPageAfterWrite.current && page > 1 && error instanceof ApiError && error.status === 404 && error.errors.some(item => item.code === 'page_not_found')
      recoverPageAfterWrite.current = false
      if (recover) setParams(previous => { const next = new URLSearchParams(previous); next.delete('page'); return next }, { replace: true })
      else setResult({ key, error })
    })
    return () => controller.abort()
  }, [key, apiKey, attempt, invalidQuery, readable, mine, page, setParams])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'hidden' && !document.querySelector('dialog[open]')) { setResult({ key }); setAttempt(value => value + 1) }
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [key])

  function update(values: Record<string, string>, reset = false) {
    const next = reset ? new URLSearchParams() : new URLSearchParams(params)
    next.delete('page'); next.delete('scope'); if (!mine) next.delete('status')
    Object.entries(values).forEach(([name, value]) => value ? next.set(name, value) : next.delete(name))
    setParams(next)
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nextQ = String(form.get('q') || '').trim()
    const nextArea = String(form.get('area') || '').trim()
    if (nextQ && (nextQ.length < 2 || nextQ.length > 100)) { setSearchError('Gunakan 2–100 karakter untuk pencarian.'); return }
    setSearchError(undefined)
    update({ q: nextQ, area: nextArea })
  }
  function reset() { setFilters(blankFilters); setSearchError(undefined); update({}, true); setSheet(false) }
  function retry() { setResult({ key }); setAttempt(value => value + 1) }
  function changed(message: string) { setNotice(message); if (message) { recoverPageAfterWrite.current = true; setResult({ key }) } setAttempt(value => value + 1) }
  const data = readable && !invalidQuery && result.key === key ? result.data : undefined
  const error = readable && !invalidQuery && result.key === key ? result.error : undefined
  const pending = !data && error === undefined && !invalidQuery
  const { clearSession } = auth
  useEffect(() => { if (mine && error instanceof ApiError && error.status === 401) clearSession() }, [mine, error, clearSession])
  useEffect(() => {
    const now = Date.now()
    const deadlines = data?.results.map(request => Date.parse(request.valid_until)).filter(value => Number.isFinite(value) && value > now) || []
    if (!deadlines.length) return
    const timer = setTimeout(() => { if (!document.querySelector('dialog[open]')) setResult({ key }); setAttempt(value => value + 1) }, Math.min(Math.min(...deadlines) - now + 50, 2_147_483_647))
    return () => clearTimeout(timer)
  }, [data, key])
  const filterControls = <div className="flex flex-col gap-3">
    {mine && <FormField label="Status"><Select name="status" value={status} onChange={event => update({ status: event.target.value })} placeholder="Semua status" options={statuses.map(value => ({ value, label: requestLabel(value) }))} /></FormField>}
    {reference.status === 'loading' && <p role="status">Memuat pilihan filter…</p>}
    {reference.status === 'error' && <><p className="text-sm text-muted">Pilihan resource belum tersedia. Pencarian dan filter donasi tetap dapat digunakan.</p><Button variant="secondary" onClick={reference.retry}>Muat pilihan filter</Button></>}
    {reference.status === 'ready' && <>
      <FormField label="Jenis resource"><Select name="resource_type" value={filters.resource_type} onChange={event => setFilters({ ...filters, resource_type: event.target.value, category: '', intended_use: '' })} placeholder="Semua jenis" options={reference.data.resource_types.map(item => ({ value: item.code, label: requestLabel(item.code) }))} /></FormField>
    </>}
    <FormField label="Preferensi harga"><Select name="donate_only" value={filters.donate_only} onChange={event => setFilters({ ...filters, donate_only: event.target.value })} placeholder="Semua preferensi" options={[{ value: 'true', label: 'Donasi saja' }, { value: 'false', label: 'Donasi atau berbayar' }]} /></FormField>
    <Button onClick={() => { update({ ...filters, ...(sheet ? { area: filterArea.trim() } : {}) }); setSheet(false) }}>Terapkan filter</Button>
    <Button variant="secondary" onClick={reset}>Reset</Button>
    <details className="request-advanced" open={Boolean(active.category || active.intended_use || ordering !== '-created_at') || undefined}><summary>Filter lainnya</summary><div className="mt-3 flex flex-col gap-3">
      {sheet && <FormField label="Area"><Input name="filter_area" value={filterArea} maxLength={100} onChange={event => setFilterArea(event.target.value)} placeholder="Kota atau area" /></FormField>}
      {reference.status === 'ready' && <><FormField label="Kategori"><Select name="category" value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })} placeholder="Semua kategori" options={reference.data.categories.filter(item => !filters.resource_type || item.resource_type === filters.resource_type).map(item => ({ value: item.code, label: item.label }))} /></FormField><FormField label="Peruntukan"><Select name="intended_use" value={filters.intended_use} onChange={event => setFilters({ ...filters, intended_use: event.target.value })} placeholder="Semua peruntukan" options={(filters.resource_type ? suitabilityOptions(reference.data, filters.resource_type) : reference.data.suitabilities).map(item => ({ value: item.code, label: requestLabel(item.code) }))} /></FormField></>}
      <FormField label="Urutkan"><Select name="ordering" value={ordering} onChange={event => update({ ordering: event.target.value })} options={orders} /></FormField>
    </div></details>
  </div>
  return <div className={`request-container request-browse ${mine ? 'request-history' : ''}`}>
    <header className="request-browse-heading"><p className="request-caption">{mine ? 'REQUEST / REQUEST SAYA' : 'REQUEST / SALING MEMBANTU'}</p><h1 className="request-heading">{mine ? 'Request saya' : 'Yang kamu punya, mereka butuhkan.'}</h1><p className="request-intro">{mine ? 'Kelola kebutuhan dan lihat histori semua status, termasuk request yang diarsipkan.' : 'Lihat kebutuhan pangan dan bahan organik di sekitarmu.'}</p></header>
    {notice && <Alert tone="success" title={notice} />}
    <form key={`${q}:${area}`} role="search" onSubmit={search} className="request-search">
      <div className="request-search-query"><FormField label="Cari kebutuhan" error={searchError}><Input name="q" defaultValue={q} maxLength={100} placeholder="Nama atau jenis kebutuhan" /></FormField></div>
      <div className="request-search-area"><AreaAutocomplete initial={area} placeholder="Kota atau area" /></div><Button className="request-search-submit" type="submit">Cari request</Button><Link className="fr-button request-create" to="/requests/new">+ Buat request</Link>
    </form>
    <Button variant="secondary" className="-mt-3 nav:hidden" onClick={() => { setFilters(active); setSheet(true) }}>Filter</Button>
    <FilterSheet title="Filter kebutuhan" open={sheet} onClose={() => setSheet(false)}>{sheet && filterControls}</FilterSheet>
    <div className="request-filter-summary nav:hidden"><span>{active.resource_type ? requestLabel(active.resource_type) : 'Semua jenis'}</span><span>{active.donate_only === 'true' ? 'Donasi saja' : active.donate_only === 'false' ? 'Donasi atau berbayar' : 'Semua preferensi'}</span></div>
    <div className="grid items-start gap-6 nav:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden flex-col gap-3 rounded-md bg-surface p-4 nav:flex"><h2 className="m-0 text-lg">Saring kebutuhan</h2>{!sheet && filterControls}</aside>
      <section aria-label="Hasil pencarian kebutuhan" aria-busy={pending} className="min-w-0">
        <div className="request-results-heading"><h2>{mine ? 'Histori kebutuhan' : 'Kebutuhan yang masih terbuka'}</h2><p role="status">{data ? `${data.count} request ditemukan` : 'Temukan kebutuhan yang sesuai.'}</p></div>
        {invalidQuery && <PageState error title="Pencarian tidak valid" action={<Button onClick={reset}>Reset pencarian</Button>}>Periksa kata pencarian, area, urutan, dan nomor halaman.</PageState>}
        {pending && <p role="status">Memuat kebutuhan…</p>}
        {error !== undefined && <PageState error title="Kebutuhan belum dapat dimuat" action={<div className="flex flex-wrap gap-3"><Button onClick={retry}>Coba lagi</Button><Button variant="secondary" onClick={reset}>Reset pencarian</Button></div>}>{requestError(error)}</PageState>}
        {data && (data.results.length ? <><div className="grid items-start gap-4 nav:grid-cols-2">{data.results.map(request => {
          const category = reference.data?.categories.find(item => item.code === request.category)?.label || requestLabel(request.category)
          return <div key={request.id} className={`flex min-w-0 flex-col gap-3 ${mine ? 'request-history-item' : ''}`}><RequestCard title={`Kebutuhan ${category}`} category={category} showCounters={mine} resourceType={request.resource_type === 'COMPOSTABLE_FOOD_WASTE' ? 'organic' : 'packaged'} remaining={quantityText(request.quantity_remaining)} total={quantityText(request.quantity_needed)} allocated={quantityText(request.quantity_allocated)} fulfilled={quantityText(request.quantity_fulfilled)} unit={request.unit} budgetHint={budgetSummary(request)} deadline={deadlineText(request.valid_until)} intendedUse={requestLabel(request.intended_use)} area={request.location.area} status={mine ? requestLabel(request.status) : request.status} to={`/requests/${request.id}`} />{mine && <>{request.archived_at && <Badge>Diarsipkan</Badge>}<RequestActions request={request} inHistory onChanged={changed} /></>}</div>
        })}</div><nav aria-label="Halaman kebutuhan" className="mt-6 flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={!data.previous || page <= 1} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>Sebelumnya</Button><span aria-current="page">Halaman {page}</span><Button variant="secondary" disabled={!data.next} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>Berikutnya</Button></nav></> : <PageState title="Belum ada kebutuhan yang sesuai" action={<Button variant="secondary" onClick={reset}>Reset pencarian</Button>}>Coba kata pencarian atau filter lain.</PageState>)}
      </section>
    </div>
    <div className="request-browse-bottom">{auth.status === 'anonymous' && <p>Masuk untuk membuat request atau menawarkan resource.</p>}<Button variant="ghost" onClick={retry}>Perbarui hasil</Button></div>
  </div>
}
