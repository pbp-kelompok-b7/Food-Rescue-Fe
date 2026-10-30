import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import LocationSearch from '../../components/location/LocationSearch.tsx'
import { changeResourceType, suitabilityOptions } from '../../components/resources/resourceFields.ts'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import { ApiError } from '../../services/api.ts'
import { requestsApi, type ResourceRequest } from '../../services/requests.ts'
import { emptyRequest, requestChanges, requestLabel, requestPayload, requestValues, requestWriteError, validateRequest, type RequestValues } from './model.ts'

export default function RequestForm({ initial }: { initial?: ResourceRequest }) {
  const reference = useReferenceData()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState<RequestValues>(() => initial ? requestValues(initial) : { ...emptyRequest, fields: { ...emptyRequest.fields } })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string>()
  const [conflict, setConflict] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [pricePreference, setPricePreference] = useState<'donate' | 'capped' | 'unlimited'>(() => initial?.donate_only ? 'donate' : initial?.max_unit_price != null ? 'capped' : 'unlimited')
  const pending = useRef(false)
  const mounted = useRef(true)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  function patch(next: Partial<RequestValues>) { setValue(current => ({ ...current, ...next })) }
  function focusError() {
    requestAnimationFrame(() => (form.current?.querySelector<HTMLElement>('input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"], [aria-invalid="true"] input') || form.current?.querySelector<HTMLInputElement>('[type="search"]'))?.focus())
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || reference.status !== 'ready' || auth.status !== 'authenticated') return
    const nextErrors = validateRequest(value, reference.data, initial)
    if (pricePreference === 'capped' && !value.max_unit_price.trim()) nextErrors.max_unit_price = 'Isi batas harga per satuan atau pilih Tanpa batas.'
    setErrors(nextErrors); setFailure(undefined); setConflict(undefined)
    if (Object.keys(nextErrors).length) { setFailure('Periksa informasi yang ditandai sebelum menyimpan.'); focusError(); return }
    const body = initial ? requestChanges(value, initial) : requestPayload(value)
    if (!Object.keys(body).length) { setFailure('Belum ada perubahan untuk disimpan.'); return }
    pending.current = true; setSubmitting(true)
    try {
      const saved = initial ? await requestsApi.update(initial.id, body) : await requestsApi.create(requestPayload(value))
      if (mounted.current) navigate(`/requests/${saved.id}`, { replace: true, state: { requestSaved: initial ? 'updated' : 'created' } })
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof ApiError && error.status === 401) {
        auth.clearSession()
        navigate('/login', { replace: true, state: { from: location.pathname + location.search + location.hash } })
        return
      }
      setFailure(requestWriteError(error))
      if (error instanceof ApiError) {
        if (error.status === 409) setConflict(error.errors.some(item => item.code === 'unit_locked') ? 'unit_locked' : 'changed')
        const aliases: Record<string, string> = { quantity_needed: 'quantity', valid_until: 'deadline', 'location.label': 'location', 'location.area': 'location', 'location.latitude': 'location', 'location.longitude': 'location' }
        const known = new Set(['resource_type', 'category', 'intended_use', 'quantity', 'unit', 'deadline', 'location', 'donate_only', 'max_unit_price'])
        const mapped: Record<string, string> = {}
        if (error.status === 400 || error.status === 409) for (const item of error.errors) {
          const field = item.field && (aliases[item.field] || item.field)
          if (field && known.has(field)) mapped[field] = item.message.slice(0, 300)
        }
        setErrors(mapped)
        focusError()
      }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false) }
  }
  return <div className="request-form">
    <header className="request-form-heading"><p className="request-caption">REQUEST / {initial ? 'EDIT REQUEST' : 'BUAT REQUEST'}</p><h1 className="request-heading">{initial ? 'Perbarui kebutuhanmu.' : 'Lagi butuh apa?'}</h1><p className="request-intro">Jelaskan kebutuhanmu supaya provider bisa menawarkan resource yang cocok.</p></header>
    {reference.status === 'loading' && <p role="status">Memuat pilihan resource…</p>}
    {reference.status === 'error' && <Alert tone="danger" title="Pilihan resource belum tersedia"><p>Muat kembali katalog sebelum mengisi atau menyimpan request.</p><Button variant="secondary" onClick={reference.retry}>Muat pilihan resource</Button></Alert>}
    {failure && <Alert tone="danger" title="Request belum tersimpan"><p>{failure}</p>{conflict && initial && <div className="flex flex-wrap gap-3">{conflict === 'unit_locked' && <Button variant="secondary" onClick={() => {
      patch({ fields: { ...value.fields, resource_type: initial.resource_type, category: initial.category, intended_use: initial.intended_use, unit: initial.unit } })
      setErrors({}); setConflict(undefined); setFailure(undefined)
    }}>Pulihkan field terkunci</Button>}<Link to={`/requests/${initial.id}`}>Lihat status terbaru</Link></div>}</Alert>}
    {initial && (initial.status !== 'OPEN' || initial.archived_at) && <Alert title={`Status: ${requestLabel(initial.status)}${initial.archived_at ? ' · Diarsipkan' : ''}`}><p>Perubahan informasi tidak membuka kembali request atau mengubah kesepakatan yang sudah diterima.</p></Alert>}
    {reference.status === 'ready' && <form ref={form} onSubmit={submit} noValidate className="request-form-card">
      <fieldset disabled={submitting} className="m-0 flex min-w-0 flex-col gap-7 border-0 p-0"><legend className="sr-only">Informasi kebutuhan</legend>
        <section className="request-form-section" aria-labelledby="request-resource"><h2 id="request-resource">Resource yang dibutuhkan</h2>
          <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={errors.resource_type ? 'request-type-error' : undefined}><legend className="mb-4 text-sm">Jenis resource (wajib)</legend><div className="request-segments">{[...reference.data.resource_types].sort((a, b) => a.code === b.code ? 0 : a.code === 'COMPOSTABLE_FOOD_WASTE' ? -1 : 1).map(item => <label key={item.code} className="request-segment"><input className="peer" type="radio" name="resource_type" value={item.code} checked={value.fields.resource_type === item.code} onChange={() => patch({ fields: changeResourceType(value.fields, item.code) })} aria-invalid={Boolean(errors.resource_type)} /><span className="fr-button">{requestLabel(item.code)}</span></label>)}</div>{errors.resource_type && <p id="request-type-error" className="mt-2 mb-0 text-sm text-danger">{errors.resource_type}</p>}</fieldset>
          <div className="grid gap-5 nav:grid-cols-2"><FormField label="Kategori" error={errors.category} required><Select name="category" value={value.fields.category} disabled={!value.fields.resource_type} placeholder="Pilih kategori" options={reference.data.categories.filter(item => item.resource_type === value.fields.resource_type).map(item => ({ value: item.code, label: item.label }))} onChange={event => patch({ fields: { ...value.fields, category: event.target.value } })} /></FormField><FormField label="Peruntukan" error={errors.intended_use} required><Select name="intended_use" value={value.fields.intended_use} disabled={!value.fields.resource_type} placeholder="Pilih peruntukan" options={suitabilityOptions(reference.data, value.fields.resource_type).map(item => ({ value: item.code, label: item.label }))} onChange={event => patch({ fields: { ...value.fields, intended_use: event.target.value } })} /></FormField></div>
        </section>
        <section className="request-form-section" aria-labelledby="request-preferences"><h2 id="request-preferences">Jumlah &amp; preferensi</h2>
          <div className="grid gap-5 nav:grid-cols-2"><FormField label="Jumlah dibutuhkan" error={errors.quantity} required><Input name="quantity_needed" inputMode="decimal" value={value.fields.quantity} onChange={event => patch({ fields: { ...value.fields, quantity: event.target.value } })} placeholder="Jumlah resource" /></FormField><FormField label="Satuan" error={errors.unit} required><Select name="unit" value={value.fields.unit} onChange={event => patch({ fields: { ...value.fields, unit: event.target.value } })} placeholder="Pilih satuan" options={reference.data.units.map(item => ({ value: item.code, label: item.label }))} /></FormField></div>
          <div role="group" aria-label="Preferensi harga"><p className="mb-4 text-sm">Preferensi harga</p><div className="request-price-segments"><label className="request-segment"><input className="peer" type="checkbox" name="donate_only" checked={value.donate_only} aria-invalid={Boolean(errors.donate_only)} onChange={event => { setPricePreference(event.target.checked ? 'donate' : 'unlimited'); patch({ donate_only: event.target.checked, max_unit_price: '' }) }} /><span className="fr-button">Donasi saja</span></label><Button variant={pricePreference === 'capped' ? 'primary' : 'secondary'} aria-pressed={pricePreference === 'capped'} onClick={() => { setPricePreference('capped'); patch({ donate_only: false }) }}>Batas harga</Button><Button variant={pricePreference === 'unlimited' ? 'primary' : 'secondary'} aria-pressed={pricePreference === 'unlimited'} onClick={() => { setPricePreference('unlimited'); patch({ donate_only: false, max_unit_price: '' }) }}>Tanpa batas</Button></div></div>
          {errors.donate_only && <p id="request-donation-error" className="m-0 text-sm text-danger">{errors.donate_only}</p>}
          <div hidden={pricePreference !== 'capped'}><FormField label="Batas harga per satuan (Rp)" hint={`Kosongkan jika tidak menetapkan batas harga${value.fields.unit ? ` per ${value.fields.unit}` : ''}.`} error={errors.max_unit_price}><Input name="max_unit_price" inputMode="decimal" disabled={value.donate_only} value={value.max_unit_price} onChange={event => patch({ max_unit_price: event.target.value })} placeholder="Tanpa batas harga" /></FormField></div>
        </section>
        <section className="request-form-section" aria-labelledby="request-location"><h2 id="request-location">Area &amp; batas waktu</h2><LocationSearch compact value={value.location} onChange={next => patch({ location: next })} disabled={submitting} error={errors.location} /><FormField label="Terima tawaran sampai" hint="Waktu Indonesia Barat (Asia/Jakarta)." error={errors.deadline} required><Input name="valid_until" type="datetime-local" value={value.fields.deadline} onChange={event => patch({ fields: { ...value.fields, deadline: event.target.value } })} /></FormField></section>
        <div className="request-form-buttons"><Button type="submit" loading={submitting}>{submitting ? 'Menyimpan request…' : initial ? 'Simpan perubahan' : 'Terbitkan request'}</Button><Link className="fr-button" aria-disabled={submitting || undefined} tabIndex={submitting ? -1 : undefined} onClick={event => { if (pending.current) event.preventDefault() }} to={initial ? `/requests/${initial.id}` : '/requests'}>Batal</Link></div>
        <p className="m-0 text-xs text-muted">Request dapat diperbarui setelah diterbitkan. Kesepakatan yang sudah diterima tetap mengikuti deadline resource masing-masing.</p>
      </fieldset>
    </form>}
  </div>
}
