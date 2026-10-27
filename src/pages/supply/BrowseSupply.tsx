import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import { ApiError } from '../../services/api.ts'
import { SupplyActions } from './SupplyDetail.tsx'
import PageState from '../../components/PageState.tsx'
import FilterSheet from '../../components/resources/FilterSheet.tsx'
import SupplyCard from '../../components/resources/SupplyCard.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import { suitabilityOptions } from '../../components/resources/resourceFields.ts'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import { listingsApi, type ListingPage } from '../../services/listings.ts'
import { deadlineText, priceText, quantityText, supplyError, supplyLabel } from './model.ts'

type Filters = Record<'resource_type' | 'category' | 'mode' | 'suitability', string>
const blankFilters: Filters = { resource_type: '', category: '', mode: '', suitability: '' }
const orderOptions = [
  { value: '-created_at', label: 'Terbaru' }, { value: 'created_at', label: 'Terlama' },
  { value: 'available_until', label: 'Batas waktu terdekat' }, { value: '-available_until', label: 'Batas waktu terjauh' },
]

export default function BrowseSupply({ mine = false }: { mine?: boolean }) {
  const [params, setParams] = useSearchParams()
  const auth = useAuth()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  const reference = useReferenceData()
  const q = params.get('q') || ''
  const area = params.get('area') || ''
  const status = mine ? params.get('status') || '' : ''
  const pageValue = params.get('page') || '1'
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) ? Number(pageValue) : 1
  const ordering = orderOptions.some(option => option.value === params.get('ordering')) ? params.get('ordering')! : '-created_at'
  const active = Object.fromEntries(Object.keys(blankFilters).map(key => [key, params.get(key) || ''])) as Filters
  const [filters, setFilters] = useState(active)
  const [sheet, setSheet] = useState(false)
  const [searchError, setSearchError] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: ListingPage; error?: unknown }>({ key: '' })
  // Build an explicit allowlist; owner history always uses scope=mine.
  const query = new URLSearchParams({ page: String(page), page_size: '20', ordering })
  if (mine) query.set('scope', 'mine')
  if (status) query.set('status', status)
  if (q) query.set('q', q)
  if (area) query.set('area', area)
  Object.entries(active).forEach(([key, value]) => { if (value) query.set(key, value) })
  const key = query.toString()
  const { clearSession } = auth
  const [filterKey, setFilterKey] = useState(key)
  if (filterKey !== key) { setFilterKey(key); setFilters(active) }
  useEffect(() => {
    const controller = new AbortController()
    if ((q && (q.trim().length < 2 || q.length > 100)) || area.length > 100) return () => controller.abort()
    listingsApi.list(Object.fromEntries(new URLSearchParams(key)), { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ key, data })
    }).catch(error => {
      if (!controller.signal.aborted) {
        if (mine && error instanceof ApiError && error.status === 401) clearSession()
        setResult({ key, error })
      }
    })
    return () => controller.abort()
  }, [key, attempt, q, area, mine, clearSession, location.key])

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
    if ((nextQ && (nextQ.length < 2 || nextQ.length > 100)) || nextArea.length > 100) { setSearchError('Periksa kata pencarian dan area.'); return }
    setSearchError(undefined)
    update({ q: nextQ, area: nextArea })
  }
  function apply() { update(filters); setSheet(false) }
  function reset() { setFilters(blankFilters); setSearchError(undefined); update({}, true); setSheet(false) }
  const invalidQuery = Boolean((q && (q.trim().length < 2 || q.length > 100)) || area.length > 100)
  const data = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  const pending = !data && !error && !invalidQuery
  function retry() { setResult({ key }); setAttempt(value => value + 1) }
  function changed(message: string) { setNotice(message); setAttempt(value => value + 1) }
  const filterControls = <div className="flex flex-col gap-3">
    {reference.status === 'loading' && <p role="status">Memuat pilihan filter…</p>}
    {reference.status === 'error' && <><p className="text-sm text-muted">Pilihan filter belum tersedia. Pencarian tetap dapat digunakan.</p><Button variant="secondary" onClick={reference.retry}>Muat pilihan filter</Button></>}
    {reference.status === 'ready' && <>
      <FormField label="Jenis resource"><Select value={filters.resource_type} onChange={event => setFilters({ ...filters, resource_type: event.target.value, category: '', suitability: '' })} placeholder="Semua jenis" options={reference.data.resource_types.map(item => ({ value: item.code, label: supplyLabel(item.code) }))} /></FormField>
      <FormField label="Kategori"><Select value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })} placeholder="Semua kategori" options={reference.data.categories.filter(item => !filters.resource_type || item.resource_type === filters.resource_type).map(item => ({ value: item.code, label: item.label }))} /></FormField>
      <FormField label="Cara berbagi"><Select value={filters.mode} onChange={event => setFilters({ ...filters, mode: event.target.value })} placeholder="Donasi & jual" options={reference.data.modes.map(item => ({ value: item.code, label: supplyLabel(item.code) }))} /></FormField>
      <FormField label="Peruntukan"><Select value={filters.suitability} onChange={event => setFilters({ ...filters, suitability: event.target.value })} placeholder="Semua peruntukan" options={(filters.resource_type ? suitabilityOptions(reference.data, filters.resource_type) : reference.data.suitabilities).map(item => ({ value: item.code, label: supplyLabel(item.code) }))} /></FormField>
    </>}
    <Button disabled={reference.status !== 'ready'} onClick={apply}>Terapkan filter</Button>
    <Button variant="secondary" onClick={reset}>Reset</Button>
  </div>
  return <div className="min-h-150 bg-canvas"><div className="supply-container flex flex-col gap-6">
    <header className="flex flex-col gap-3">
      <p className="supply-caption">{mine ? 'SUPPLY / MILIK SAYA' : 'SUPPLY / BERBAGI YANG BERARTI'}</p>
      <div className="flex flex-wrap items-start justify-between gap-4"><h1 className="supply-heading max-w-180 text-primary">{mine ? 'Supply saya' : 'Surplus ketemu manfaat.'}</h1>{auth.status === 'authenticated' && <Link className="fr-button" to="/supply/new">Tawarkan resource</Link>}</div>
      <p className="m-0 text-sm text-muted nav:text-base">{mine ? 'Kelola resource yang kamu bagikan dan buka kembali histori supply di semua status.' : 'Cari makanan kemasan atau bahan organik yang bisa dimanfaatkan.'}</p>
    </header>
    {notice && <Alert tone="success" title={notice} />}
    {mine && location.state?.supplyRemoved && !notice && <Alert tone="success" title="Supply berhasil dihapus atau diarsipkan sesuai riwayat transaksi." />}
    {mine && <FormField label="Status supply"><Select aria-label="Status supply" value={status} placeholder="Semua status" options={['AVAILABLE', 'RESERVED', 'COMPLETED', 'CLOSED', 'EXPIRED'].map(value => ({ value, label: supplyLabel(value) }))} onChange={event => update({ status: event.target.value })} /></FormField>}
    <form key={`${q}:${area}`} role="search" onSubmit={search} className="grid items-end gap-3 nav:grid-cols-[minmax(0,500px)_minmax(0,300px)_120px]">
      <FormField label="Cari resource" error={searchError}><Input name="q" defaultValue={q} maxLength={100} placeholder="Nama atau jenis resource" /></FormField>
      <FormField label="Area"><Input name="area" defaultValue={area} maxLength={100} placeholder="Semua area" /></FormField>
      <Button type="submit" aria-label="Cari resource">Cari</Button>
    </form>
    <Button variant="secondary" className="nav:hidden" onClick={() => { setFilters(active); setSheet(true) }}>Filter</Button>
    <FilterSheet open={sheet} onClose={() => setSheet(false)}>{sheet && filterControls}</FilterSheet>
    <div className="grid items-start gap-6 nav:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden flex-col gap-3 rounded-md bg-surface p-4 nav:flex"><h2 className="m-0 text-lg">Saring resource</h2>{!sheet && filterControls}</aside>
      <section aria-label="Hasil pencarian" aria-busy={pending} className="min-w-0">
        <div className="mb-4 flex flex-col gap-4"><h2 className="m-0 text-lg">{mine ? 'Resource yang kamu bagikan' : 'Pilihan untuk dimanfaatkan'}</h2><p className="m-0 text-xs text-muted">{data ? `${data.count} supply${area ? ` · ${area}` : ''}` : 'Temukan resource yang sesuai.'}</p></div>
        {invalidQuery && <PageState error title="Pencarian tidak valid" action={<Button onClick={reset}>Reset pencarian</Button>}>Periksa kata pencarian dan area.</PageState>}
        {pending && <p role="status">Memuat supply…</p>}
        {error !== undefined && <PageState error title="Supply belum dapat dimuat" action={<Button onClick={retry}>Coba lagi</Button>}>{supplyError(error)}</PageState>}
        {data && (data.results.length ? <><div className="grid items-start gap-4 xl:grid-cols-2">{data.results.map(listing => <SupplyCard key={listing.id} title={listing.title} resourceType={listing.resource_type === 'COMPOSTABLE_FOOD_WASTE' ? 'organic' : 'packaged'} mode={listing.mode} status={{ code: listing.status, label: supplyLabel(listing.status) }} quantity={quantityText(listing.quantity_available)} unit={listing.unit} unitPrice={priceText(listing.unit_price)} deadline={deadlineText(listing.available_until)} area={listing.location.area} intendedUse={listing.suitability.map(supplyLabel).join(' · ')} condition={listing.condition} to={`/supply/${listing.id}`} action={mine ? <div className="flex w-full flex-col gap-3">{listing.archived_at && <Badge>Diarsipkan</Badge>}<dl className="m-0 grid w-full grid-cols-2 gap-2 border-t border-border pt-3 text-sm"><dt>Total</dt><dd className="m-0">{quantityText(listing.quantity_total)} {listing.unit}</dd><dt>Dialokasikan</dt><dd className="m-0">{quantityText(listing.quantity_allocated)} {listing.unit}</dd><dt>Selesai diambil</dt><dd className="m-0">{quantityText(listing.quantity_completed)} {listing.unit}</dd></dl><SupplyActions listing={listing} onChanged={changed} /></div> : undefined} />)}</div><nav aria-label="Halaman supply" className="mt-6 flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>Sebelumnya</Button><span aria-current="page">Halaman {page}</span><Button variant="secondary" disabled={!data.next} onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>Berikutnya</Button></nav></> : <PageState title={mine ? 'Belum ada supply pada pilihan ini' : 'Belum ada supply yang sesuai'} action={<Button variant="secondary" onClick={reset}>Reset pencarian</Button>}>Coba kata pencarian atau filter lain.</PageState>)}
      </section>
    </div>
    {auth.status === 'anonymous' && <p className="m-0 text-sm text-muted"><Link to="/login" state={{ from: '/supply/new' }}>Masuk</Link> untuk menawarkan supply atau mengajukan reservasi.</p>}
  </div></div>
}
