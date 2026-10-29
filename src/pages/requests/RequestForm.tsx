import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import LocationSearch from '../../components/location/LocationSearch.tsx'
import { ResourceFieldControls } from '../../components/resources/ResourceFields.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import Checkbox from '../../components/ui/Checkbox.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
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
  const pending = useRef(false)
  const mounted = useRef(true)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  function patch(next: Partial<RequestValues>) { setValue(current => ({ ...current, ...next })) }
  function focusError() {
    requestAnimationFrame(() => (form.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], [aria-invalid="true"] input') || form.current?.querySelector<HTMLInputElement>('[type="search"]'))?.focus())
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || reference.status !== 'ready' || auth.status !== 'authenticated') return
    const nextErrors = validateRequest(value, reference.data, initial)
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
  return <div className="mx-auto flex w-full max-w-190 flex-col gap-6">
    <header className="flex flex-col gap-3"><p className="m-0 text-xs font-semibold text-primary">REQUEST BOARD / {initial ? 'EDIT' : 'BUAT REQUEST'}</p><h1 className="m-0 font-brand text-2xl font-semibold text-primary nav:text-[32px]">{initial ? 'Edit kebutuhan resource' : 'Buat kebutuhan resource'}</h1><p className="m-0 text-sm text-muted">Sampaikan kebutuhanmu agar provider dapat menawarkan resource yang sesuai.</p></header>
    {reference.status === 'loading' && <p role="status">Memuat pilihan resource…</p>}
    {reference.status === 'error' && <Alert tone="danger" title="Pilihan resource belum tersedia"><p>Muat kembali katalog sebelum mengisi atau menyimpan request.</p><Button variant="secondary" onClick={reference.retry}>Muat pilihan resource</Button></Alert>}
    {failure && <Alert tone="danger" title="Request belum tersimpan"><p>{failure}</p>{conflict && initial && <div className="flex flex-wrap gap-3">{conflict === 'unit_locked' && <Button variant="secondary" onClick={() => {
      patch({ fields: { ...value.fields, resource_type: initial.resource_type, category: initial.category, intended_use: initial.intended_use, unit: initial.unit } })
      setErrors({}); setConflict(undefined); setFailure(undefined)
    }}>Pulihkan field terkunci</Button>}<Link to={`/requests/${initial.id}`}>Lihat status terbaru</Link></div>}</Alert>}
    {initial && (initial.status !== 'OPEN' || initial.archived_at) && <Alert title={`Status: ${requestLabel(initial.status)}${initial.archived_at ? ' · Diarsipkan' : ''}`}><p>Perubahan informasi tidak membuka kembali request atau mengubah kesepakatan yang sudah diterima.</p></Alert>}
    {reference.status === 'ready' && <form ref={form} onSubmit={submit} noValidate className="rounded-xl bg-surface p-5 nav:p-8">
      <fieldset disabled={submitting} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0"><legend className="sr-only">Informasi kebutuhan</legend>
        <ResourceFieldControls data={reference.data} kind="request" value={value.fields} onChange={fields => patch({ fields })} errors={errors} disabled={submitting} />
        <section className="flex flex-col gap-3" aria-labelledby="request-preferences"><h2 id="request-preferences" className="m-0 text-lg">Preferensi penawaran</h2>
          <Checkbox name="donate_only" label="Hanya menerima donasi" checked={value.donate_only} aria-invalid={Boolean(errors.donate_only)} aria-describedby={errors.donate_only ? 'request-donation-error' : undefined} onChange={event => patch({ donate_only: event.target.checked, max_unit_price: event.target.checked ? '' : value.max_unit_price })} />
          {errors.donate_only && <p id="request-donation-error" className="m-0 text-sm text-danger">{errors.donate_only}</p>}
          <FormField label="Batas harga per satuan (Rp)" hint={value.donate_only ? 'Donasi tidak memiliki harga berbayar.' : `Opsional. Kosongkan jika tidak menetapkan batas harga${value.fields.unit ? ` per ${value.fields.unit}` : ''}.`} error={errors.max_unit_price}><Input name="max_unit_price" inputMode="decimal" disabled={value.donate_only} value={value.max_unit_price} onChange={event => patch({ max_unit_price: event.target.value })} placeholder="Tanpa batas harga" /></FormField>
        </section>
        <section aria-labelledby="request-location"><h2 id="request-location" className="mb-3 text-lg">Lokasi kebutuhan</h2><LocationSearch value={value.location} onChange={next => patch({ location: next })} disabled={submitting} error={errors.location} /></section>
        <p className="m-0 text-sm text-muted">Batas waktu kebutuhan menentukan kapan penawaran baru berhenti diterima. Kesepakatan yang sudah diterima tetap mengikuti deadline resource masing-masing.</p>
        <Button type="submit" className="w-full" loading={submitting}>{submitting ? 'Menyimpan request…' : initial ? 'Simpan perubahan' : 'Terbitkan request'}</Button>
        <Link className="self-start text-sm" aria-disabled={submitting || undefined} tabIndex={submitting ? -1 : undefined} onClick={event => { if (pending.current) event.preventDefault() }} to={initial ? `/requests/${initial.id}` : '/requests'}>Batal</Link>
      </fieldset>
    </form>}
  </div>
}
