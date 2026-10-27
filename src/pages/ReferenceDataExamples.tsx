import { useState } from 'react'
import { ResourceFieldControls } from '../components/resources/ResourceFields.tsx'
import { emptyResourceFields, resourceFieldsPayload, validateResourceFields, type ResourceFormKind } from '../components/resources/resourceFields.ts'
import useReferenceData from '../components/resources/useReferenceData.ts'
import LocationSearch from '../components/location/LocationSearch.tsx'
import { locationPayload, type LocationResult } from '../services/reference.ts'
import Alert from '../components/ui/Alert.tsx'
import Button from '../components/ui/Button.tsx'
import FormField from '../components/ui/FormField.tsx'
import Select from '../components/ui/Select.tsx'

// Development-only integration example. It never submits a business transaction.
export default function ReferenceDataExamples() {
  const reference = useReferenceData()
  const [kind, setKind] = useState<ResourceFormKind>('supply')
  const [values, setValues] = useState({ ...emptyResourceFields })
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [payload, setPayload] = useState<string>()
  return <section id="reference-location" className="flex max-w-180 flex-col gap-5 scroll-mt-6">
    <h2 className="border-b border-border pb-3">Reference-data & lokasi · API</h2>
    <p className="m-0 text-muted">Contoh integrasi Supply, Request, dan Offer. Pilihan dan pencarian memakai API backend; pemeriksaan ini tidak membuat transaksi.</p>
    <FormField label="Contoh penggunaan"><Select value={kind} options={[{ value: 'supply', label: 'Supply' }, { value: 'request', label: 'Request' }, { value: 'offer', label: 'Offer' }]} onChange={event => {
      setKind(event.target.value as ResourceFormKind)
      setValues({ ...emptyResourceFields })
      setLocation(null)
      setErrors({})
      setPayload(undefined)
    }} /></FormField>
    <form noValidate className="flex min-w-0 flex-col gap-5" onSubmit={event => {
      event.preventDefault()
      if (reference.status !== 'ready') return
      const next = validateResourceFields(values, reference.data, kind)
      if (!location) next.location = 'Pilih lokasi dari hasil pencarian.'
      setErrors(next)
      if (!Object.keys(next).length && location) setPayload(JSON.stringify({ ...resourceFieldsPayload(values, reference.data, kind), location: locationPayload(location) }, null, 2))
    }}>
      {reference.status === 'loading' && <p role="status">Memuat pilihan resource…</p>}
      {reference.status === 'error' && <Alert tone="danger" title="Pilihan resource belum tersedia"><p>Coba muat kembali untuk melanjutkan.</p><Button variant="secondary" onClick={reference.retry}>Coba lagi</Button></Alert>}
      {reference.status === 'ready' && <ResourceFieldControls data={reference.data} kind={kind} value={values} onChange={next => { setValues(next); setPayload(undefined); setErrors({}) }} errors={errors} />}
      <LocationSearch key={kind} value={location} onChange={next => { setLocation(next); setPayload(undefined) }} error={errors.location} />
      <Button type="submit" disabled={reference.status !== 'ready'} className="self-start">Periksa pilihan</Button>
    </form>
    {payload && <pre role="status" className="m-0 overflow-x-auto rounded-md bg-surface-variant p-4 text-sm">{payload}</pre>}
  </section>
}
