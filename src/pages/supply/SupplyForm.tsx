import PhotoInput from '../../components/resources/PhotoInput.tsx'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import LocationSearch from '../../components/location/LocationSearch.tsx'
import PageState from '../../components/PageState.tsx'
import { changeResourceType, suitabilityOptions, type ResourceFieldValues } from '../../components/resources/resourceFields.ts'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import Checkbox from '../../components/ui/Checkbox.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { listingsApi, type Listing } from '../../services/listings.ts'
import { emptySupply, listingChanges, listingValues, supplyError, supplyLabel, supplyPayload, validateSupply, type SupplyValues } from './model.ts'

function Choices({ name, label, items, value, onChange, error }: {
  name: string; label: string; items: { code: string; label: string }[]; value: string; onChange: (value: string) => void; error?: string
}) {
  return <fieldset className="m-0 min-w-0 border-0 p-0" aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}>
    <legend className="mb-2 text-sm font-semibold">{label}</legend>
    <div className="grid gap-2 sm:grid-cols-2">{items.map(item => <label key={item.code} className={`relative flex min-h-11 cursor-pointer items-center rounded-md p-3 text-sm ${value === item.code ? 'bg-primary text-white' : 'bg-supply-input text-ink'}`}><input type="radio" name={name} value={item.code} checked={value === item.code} onChange={() => onChange(item.code)} className="peer sr-only" /><span className="peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4">{supplyLabel(item.code)}</span></label>)}</div>
    {error && <p id={`${name}-error`} className="mt-2 mb-0 text-sm text-danger">{error}</p>}
  </fieldset>
}

export default function SupplyForm({ initial }: { initial?: Listing }) {
  const reference = useReferenceData()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState<SupplyValues>(() => initial ? listingValues(initial) : emptySupply)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string>()
  const [conflict, setConflict] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [image, setImage] = useState<File | null>()
  const [showNotes, setShowNotes] = useState(Boolean(initial?.storage_notes || initial?.allergen_notes || initial?.packaging_status))
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const formRef = useRef<HTMLFormElement>(null)
  const fields = value.fields
  const patch = (next: Partial<SupplyValues>) => setValue(current => ({ ...current, ...next }))
  const patchFields = (next: Partial<ResourceFieldValues>) => setValue(current => ({ ...current, fields: { ...current.fields, ...next } }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || reference.status !== 'ready' || auth.status !== 'authenticated') return
    const nextErrors = validateSupply(value, reference.data, initial)
    setErrors(nextErrors); setFailure(undefined); setConflict(false)
    if (Object.keys(nextErrors).length) {
      if (nextErrors.storage_notes || nextErrors.allergen_notes || nextErrors.packaging_status) setShowNotes(true)
      setFailure('Periksa informasi yang ditandai sebelum menyimpan.')
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"] input, input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"], [aria-invalid="true"] button')?.focus())
      return
    }
    const body = initial ? listingChanges(value, initial) : supplyPayload(value)
    if (!Object.keys(body).length && image === undefined) { setFailure('Belum ada perubahan untuk disimpan.'); return }
    pending.current = true; setSubmitting(true)
    try {
      const saved = initial ? await listingsApi.update(initial.id, body, image) : await listingsApi.create(supplyPayload(value), image)
      if (!mounted.current) return
      navigate(`/supply/${saved.id}`, { replace: true, state: { supplySaved: initial ? 'updated' : 'created' } })
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof ApiError && error.status === 401) {
        auth.clearSession()
        navigate('/login', { replace: true, state: { from: location.pathname + location.search + location.hash } })
        return
      }
      setFailure(supplyError(error))
      if (error instanceof ApiError) {
        setConflict(error.status === 409)
        // Only known fields receive inline errors; React escapes plain text messages.
        const aliases: Record<string, string> = { quantity_total: 'quantity', available_until: 'deadline', 'location.label': 'location', 'location.area': 'location', 'location.latitude': 'location', 'location.longitude': 'location' }
        const known = new Set(['image', 'title', 'description', 'condition', 'resource_type', 'category', 'unit', 'suitability', 'mode', 'unit_price', 'quantity', 'deadline', 'location', 'storage_notes', 'allergen_notes', 'packaging_status'])
        const mapped: Record<string, string> = {}
        if (error.status === 400 || error.status === 409) for (const item of error.errors) {
          const key = item.field && (aliases[item.field] || item.field)
          if (key && known.has(key) && typeof item.message === 'string') mapped[key] = item.message.slice(0, 300)
        }
        setErrors(mapped)
        if (mapped.storage_notes || mapped.allergen_notes || mapped.packaging_status) setShowNotes(true)
      }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false) }
  }

  return <div className="mx-auto max-w-222.5 px-4 py-6 nav:px-10 nav:py-12">
    <header className="mb-6 flex flex-col gap-3"><p className="supply-caption">SUPPLY / {initial ? 'EDIT RESOURCE' : 'BUAT RESOURCE'}</p><h1 className="supply-heading">{initial ? 'Edit resource' : 'Bagikan resource'}</h1><p className="m-0 text-sm text-muted">Isi informasi utama dulu; detail tambahan bisa dilengkapi seperlunya.</p></header>
    {reference.status === 'loading' && <p role="status">Memuat pilihan resource…</p>}
    {reference.status === 'error' && <PageState error title="Pilihan resource belum tersedia" action={<Button onClick={reference.retry}>Coba lagi</Button>}>Pilihan kategori dan satuan perlu dimuat sebelum form dapat digunakan.</PageState>}
    {reference.status === 'ready' && <form ref={formRef} className="supply-form flex flex-col gap-7 rounded-xl bg-surface p-4 nav:p-7" noValidate onSubmit={submit} aria-busy={submitting}>
      {failure && <Alert tone="danger" title="Supply belum disimpan"><p>{failure}</p>{conflict && initial && <Link to={`/supply/${initial.id}`} target="_blank" rel="noopener noreferrer">Periksa detail terbaru</Link>}</Alert>}
      {initial && initial.status !== 'AVAILABLE' && <Alert title={`Status: ${supplyLabel(initial.status)}`}><p>Menyimpan perubahan tidak membuka kembali supply ini.</p></Alert>}
      <fieldset disabled={submitting} className="m-0 flex min-w-0 flex-col gap-7 border-0 p-0">
        <legend className="sr-only">Informasi supply</legend>
        <section className="flex flex-col gap-4" aria-labelledby="supply-resource"><h2 id="supply-resource" className="m-0 text-lg font-semibold">01 Resource</h2>
          <FormField label="Nama resource" error={errors.title}><Input name="title" value={value.title} onChange={event => patch({ title: event.target.value })} maxLength={200} placeholder="Contoh: Roti gandum kemasan" /></FormField>
          <FormField label="Deskripsi" error={errors.description}><Textarea className="h-18 min-h-18" name="description" value={value.description} onChange={event => patch({ description: event.target.value })} maxLength={5000} placeholder="Kondisi dan info untuk penerima" /></FormField>
          <Choices name="resource_type" label="Jenis resource" value={fields.resource_type} items={reference.data.resource_types} error={errors.resource_type} onChange={type => patch({ fields: changeResourceType(fields, type) })} />
          <FormField label="Kategori" error={errors.category}><Select name="category" disabled={!fields.resource_type} value={fields.category} placeholder="Pilih kategori" options={reference.data.categories.filter(item => item.resource_type === fields.resource_type).map(item => ({ value: item.code, label: item.label }))} onChange={event => patchFields({ category: event.target.value })} /></FormField>
          <fieldset className="m-0 border-0 p-0" aria-invalid={Boolean(errors.suitability)} aria-describedby={errors.suitability ? 'supply-suitability-error' : undefined}><legend className="mb-2 text-sm font-semibold">Peruntukan</legend>{!fields.resource_type && <p className="m-0 text-sm text-muted">Pilih jenis resource terlebih dahulu.</p>}{suitabilityOptions(reference.data, fields.resource_type).map(item => <Checkbox key={item.code} name="suitability" value={item.code} label={supplyLabel(item.code)} checked={fields.suitability.includes(item.code)} onChange={event => patchFields({ suitability: event.target.checked ? [...fields.suitability, item.code] : fields.suitability.filter(code => code !== item.code) })} />)}{errors.suitability && <p id="supply-suitability-error" className="mt-2 mb-0 text-sm text-danger">{errors.suitability}</p>}</fieldset>
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="supply-sharing"><h2 id="supply-sharing" className="m-0 text-lg font-semibold">02 Jumlah & cara berbagi</h2>
          <div className="grid grid-cols-2 gap-4"><FormField label="Jumlah" error={errors.quantity}><Input name="quantity_total" inputMode="decimal" value={fields.quantity} onChange={event => patchFields({ quantity: event.target.value })} placeholder="Jumlah resource" /></FormField><FormField label="Satuan" error={errors.unit}><Select name="unit" value={fields.unit} placeholder="Pilih satuan" options={reference.data.units.map(item => ({ value: item.code, label: item.label }))} onChange={event => patchFields({ unit: event.target.value })} /></FormField></div>
          <div className="grid gap-4 nav:grid-cols-2"><Choices name="mode" label="Cara berbagi" items={reference.data.modes} value={fields.mode} error={errors.mode} onChange={mode => patchFields({ mode, unit_price: mode === 'DONATE' ? '0.00' : '' })} />{fields.mode === 'SELL' && <FormField label="Harga per unit (Rp)" error={errors.unit_price}><Input name="unit_price" inputMode="decimal" value={fields.unit_price} onChange={event => patchFields({ unit_price: event.target.value })} placeholder="15000.00" /></FormField>}</div>
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="supply-pickup"><h2 id="supply-pickup" className="m-0 text-lg font-semibold">03 Kondisi & pickup</h2>
          <FormField label="Kondisi" error={errors.condition}><Textarea className="h-18 min-h-18" name="condition" value={value.condition} onChange={event => patch({ condition: event.target.value })} maxLength={1000} placeholder="Jelaskan kondisi, penyimpanan, atau catatan penting." /></FormField>
          <FormField label="Batas pickup / konsumsi" hint="Waktu Indonesia Barat (WIB)." error={errors.deadline}><Input name="available_until" type="datetime-local" value={fields.deadline} onChange={event => patchFields({ deadline: event.target.value })} /></FormField>
          <section aria-labelledby="supply-location"><h3 id="supply-location" className="mb-2 text-sm font-semibold">Lokasi pickup</h3><LocationSearch value={value.location} onChange={next => patch({ location: next })} disabled={submitting} error={errors.location} /></section>
        </section>
        <PhotoInput value={image} existing={initial?.image} onChange={setImage} error={errors.image} />
        <section aria-labelledby="supply-additional"><div className="mb-4"><h2 id="supply-additional" className="mb-1 text-lg font-semibold">Detail tambahan (opsional)</h2><p className="m-0 text-sm text-muted">Kemasan, penyimpanan, dan alergen</p></div>
          <details open={showNotes} onToggle={event => setShowNotes(event.currentTarget.open)}><summary className="cursor-pointer rounded-md bg-supply-input p-3 text-sm font-semibold">{showNotes ? 'Sembunyikan detail' : 'Tambahkan detail'}</summary><div className="mt-4 flex flex-col gap-4">
          <FormField label="Kemasan" error={errors.packaging_status}><Input name="packaging_status" value={value.packaging_status} onChange={event => patch({ packaging_status: event.target.value })} maxLength={200} /></FormField>
          <FormField label="Penyimpanan" error={errors.storage_notes}><Textarea name="storage_notes" value={value.storage_notes} onChange={event => patch({ storage_notes: event.target.value })} maxLength={2000} /></FormField>
          <FormField label="Alergen" error={errors.allergen_notes}><Textarea name="allergen_notes" value={value.allergen_notes} onChange={event => patch({ allergen_notes: event.target.value })} maxLength={2000} /></FormField>
          </div></details>
        </section>
        <Button className="w-full" type="submit" loading={submitting}>{submitting ? 'Menyimpan supply…' : initial ? 'Simpan perubahan' : 'Terbitkan supply'}</Button>
        <p className="m-0 text-sm text-muted">Informasi wajib harus lengkap sebelum diterbitkan.</p>
        <Link className="self-start text-sm" to={initial ? `/supply/${initial.id}` : '/supply'}>Batal</Link>
      </fieldset>
    </form>}
  </div>
}
