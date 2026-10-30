import { useId, type KeyboardEvent } from 'react'
import type { LocationResult } from '../../services/reference.ts'
import Alert from '../ui/Alert.tsx'
import Button from '../ui/Button.tsx'
import FormField from '../ui/FormField.tsx'
import Input from '../ui/Input.tsx'

export type { LocationResult } from '../../services/reference.ts'

// No nested form: this picker can live inside a Supply, Request or Offer form.
export default function LocationPicker({ query, onQueryChange, onSearch, results = [], selected, onSelect, loading = false, error, searched = false, attribution, area, onAreaChange, queryError, areaError, searchDisabled = false, onRetry, retryLabel = 'Coba lagi' }: {
  query: string; onQueryChange: (value: string) => void; onSearch?: (query: string) => void
  results?: LocationResult[]; selected?: LocationResult | null; onSelect: (result: LocationResult) => void
  loading?: boolean; error?: string; searched?: boolean; attribution?: string
  area?: string; onAreaChange?: (value: string) => void; queryError?: string; areaError?: string
  searchDisabled?: boolean; onRetry?: () => void; retryLabel?: string
}) {
  const id = useId()
  const enterSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!loading && !searchDisabled) onSearch?.(query)
    }
  }
  return <section className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-5" aria-label="Pemilihan lokasi">
    <FormField label="Cari alamat / lokasi" hint="Ketik nama tempat atau alamat, cari, lalu pilih lokasi yang sesuai." error={queryError}>
      <Input className="text-muted focus:text-ink" type="search" placeholder="Contoh: Kukus, Universitas Indonesia, Jalan Margonda" value={query} maxLength={200} onChange={event => onQueryChange(event.target.value)} onKeyDown={enterSearch} aria-controls={`${id}-results`} />
    </FormField>
    {onAreaChange && <FormField label="Area (opsional)" error={areaError}><Input value={area ?? ''} maxLength={100} onChange={event => onAreaChange(event.target.value)} onKeyDown={enterSearch} placeholder="Contoh: Depok" /></FormField>}
    <Button className="self-start" onClick={() => onSearch?.(query)} disabled={loading || searchDisabled} aria-label="Cari lokasi">{loading ? 'Mencari lokasi…' : 'Cari lokasi'}</Button>
    {loading && <p role="status" className="m-0 text-sm text-muted">Mencari lokasi…</p>}
    {error && <Alert tone="danger" title="Pencarian lokasi tidak tersedia"><p>{error}</p>{onRetry && <Button variant="secondary" onClick={onRetry} disabled={loading || searchDisabled}>{retryLabel}</Button>}</Alert>}
    <div id={`${id}-results`} className="flex flex-col gap-3" aria-busy={loading}>
      {results.map((result, index) => {
        const chosen = selected?.label === result.label && selected?.area === result.area && selected?.latitude === result.latitude && selected?.longitude === result.longitude
        return <div key={`${result.latitude}:${result.longitude}:${index}`} className="flex min-w-0 items-center gap-4 rounded-md border border-border p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1 wrap-anywhere"><strong>{result.label}</strong><p className="m-0 text-sm leading-[1.5] text-muted">Koordinat: {result.latitude}, {result.longitude}</p></div>
          <Button variant="secondary" className="h-11 min-w-19 shrink-0 py-0" disabled={loading} aria-pressed={chosen} onClick={() => onSelect(result)}>{chosen ? 'Terpilih' : 'Pilih'}</Button>
        </div>
      })}
    </div>
    {searched && !loading && !error && results.length === 0 && <p role="status" className="m-0 text-sm leading-[1.5] text-muted">Lokasi tidak ditemukan. Coba alamat lain.</p>}
    {attribution && <p className="m-0 text-xs text-muted wrap-anywhere">{attribution}</p>}
  </section>
}
