import { useId } from 'react'
import Alert from '../ui/Alert.tsx'
import Button from '../ui/Button.tsx'
import Checkbox from '../ui/Checkbox.tsx'
import FormField from '../ui/FormField.tsx'
import Input from '../ui/Input.tsx'
import Select from '../ui/Select.tsx'
import type { ReferenceData, ReferenceOption } from '../../services/reference.ts'
import { changeResourceType, suitabilityOptions, type ResourceFieldValues, type ResourceFormKind } from './resourceFields.ts'
import useReferenceData from './useReferenceData.ts'

export default function ResourceFields({ kind, value, onChange, errors = {}, disabled = false }: {
  kind: ResourceFormKind; value: ResourceFieldValues; onChange: (value: ResourceFieldValues) => void; errors?: Record<string, string>; disabled?: boolean
}) {
  const reference = useReferenceData()
  if (reference.status === 'loading') return <p role="status">Memuat pilihan resource…</p>
  if (reference.status === 'error') return <Alert tone="danger" title="Pilihan resource belum tersedia"><p>Coba muat kembali untuk melanjutkan.</p><Button variant="secondary" onClick={reference.retry}>Coba lagi</Button></Alert>
  return <ResourceFieldControls data={reference.data} kind={kind} value={value} onChange={onChange} errors={errors} disabled={disabled} />
}

// Also usable with one shared reference response supplied by a page/filter.
export function ResourceFieldControls({ data, kind, value, onChange, errors = {}, disabled = false }: {
  data: ReferenceData; kind: ResourceFormKind; value: ResourceFieldValues; onChange: (value: ResourceFieldValues) => void; errors?: Record<string, string>; disabled?: boolean
}) {
  const id = useId()
  const options = (items: ReferenceOption[]) => items.map(item => ({ value: item.code, label: item.label }))
  const categories = data.categories.filter(item => item.resource_type === value.resource_type)
  const suitabilities = suitabilityOptions(data, value.resource_type)
  const patch = (next: Partial<ResourceFieldValues>) => onChange({ ...value, ...next })
  return <fieldset disabled={disabled} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
    <legend className="sr-only">Pilihan resource</legend>
    <FormField label="Jenis resource" error={errors.resource_type} required><Select name="resource_type" value={value.resource_type} onChange={event => onChange(changeResourceType(value, event.target.value))} placeholder="Pilih jenis resource" options={options(data.resource_types)} /></FormField>
    <FormField label="Kategori" error={errors.category} required><Select name="category" disabled={!value.resource_type || !categories.length} value={categories.some(item => item.code === value.category) ? value.category : ''} onChange={event => patch({ category: event.target.value })} placeholder={value.resource_type && !categories.length ? 'Kategori belum tersedia' : 'Pilih kategori'} options={options(categories)} /></FormField>
    {kind === 'request' ? <FormField label="Peruntukan" error={errors.intended_use} required><Select name="intended_use" disabled={!suitabilities.length} value={suitabilities.some(item => item.code === value.intended_use) ? value.intended_use : ''} onChange={event => patch({ intended_use: event.target.value })} placeholder="Pilih peruntukan" options={options(suitabilities)} /></FormField> : <fieldset className="m-0 min-w-0 border-0 p-0" disabled={!suitabilities.length} aria-describedby={errors.suitability ? `${id}-suitability-error` : undefined} aria-invalid={Boolean(errors.suitability)}>
      <legend className="mb-2 text-sm font-semibold">Peruntukan (wajib)</legend>
      {!suitabilities.length && <p className="m-0 text-sm text-muted">Pilih jenis resource terlebih dahulu.</p>}
      {suitabilities.map(item => <Checkbox key={item.code} name="suitability" value={item.code} label={item.label} checked={value.suitability.includes(item.code)} onChange={event => patch({ suitability: event.target.checked ? [...value.suitability, item.code] : value.suitability.filter(code => code !== item.code) })} />)}
      {errors.suitability && <p id={`${id}-suitability-error`} className="m-0 text-sm text-danger">{errors.suitability}</p>}
    </fieldset>}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FormField label={kind === 'request' ? 'Jumlah dibutuhkan' : 'Jumlah'} error={errors.quantity} required><Input name={kind === 'supply' ? 'quantity_total' : kind === 'request' ? 'quantity_needed' : 'quantity'} inputMode="decimal" value={value.quantity} onChange={event => patch({ quantity: event.target.value })} placeholder="Jumlah resource" /></FormField>
      <FormField label="Satuan" error={errors.unit} required><Select name="unit" value={value.unit} onChange={event => patch({ unit: event.target.value })} placeholder="Pilih satuan" options={options(data.units)} /></FormField>
    </div>
    {kind !== 'request' && <>
      <FormField label="Cara berbagi" error={errors.mode} required><Select name="mode" value={value.mode} onChange={event => patch({ mode: event.target.value, unit_price: event.target.value === 'DONATE' ? '0.00' : '' })} placeholder="Pilih cara berbagi" options={options(data.modes)} /></FormField>
      {value.mode === 'SELL' && <FormField label="Harga per satuan (Rp)" error={errors.unit_price} required><Input name="unit_price" inputMode="decimal" value={value.unit_price} onChange={event => patch({ unit_price: event.target.value })} placeholder="Harga per satuan" /></FormField>}
    </>}
    <FormField label={kind === 'request' ? 'Batas waktu kebutuhan' : 'Tersedia sampai'} hint="Waktu Indonesia Barat (Asia/Jakarta)." error={errors.deadline} required><Input name={kind === 'supply' ? 'available_until' : kind === 'request' ? 'valid_until' : 'resource_deadline'} type="datetime-local" value={value.deadline} onChange={event => patch({ deadline: event.target.value })} /></FormField>
  </fieldset>
}
