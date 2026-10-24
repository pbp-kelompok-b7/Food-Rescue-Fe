export interface LocationResult { id: string | number; label: string; latitude?: number; longitude?: number }
import { useId } from 'react'
import Alert from '../ui/Alert.tsx'
import Button from '../ui/Button.tsx'
import FormField from '../ui/FormField.tsx'
import Input from '../ui/Input.tsx'
import Icon from '../ui/Icon.tsx'

// Search/geocoding is injected by the caller. This component makes no provider requests.
export default function LocationPicker({
  query,
  onQueryChange,
  onSearch,
  results = [],
  selectedId,
  onSelect,
  loading = false,
  error,
  searched = false,
  attribution,
}: { query: string; onQueryChange: (value: string) => void; onSearch?: (query: string) => void; results?: LocationResult[]; selectedId?: string | number; onSelect: (result: LocationResult) => void; loading?: boolean; error?: string; searched?: boolean; attribution?: string }) {
  const id = useId()
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 [&_form]:flex [&_form]:flex-col [&_form]:items-start [&_form]:gap-3 [&_form>div]:w-full" aria-label="Pemilihan lokasi">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSearch?.(query)
        }}
      >
        <FormField
          className="[&>p]:max-w-50"
          label="Cari alamat / lokasi"
          hint="Pilih hasil di bawah untuk mengonfirmasi lokasi."
        >
          <Input
            className="text-muted focus:text-ink"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-controls={`${id}-results`}
            trailing={
              <button
                type="submit"
                className="flex size-11 items-center justify-center rounded-r-md text-primary"
                aria-label="Cari lokasi"
                aria-busy={loading || undefined}
                disabled={loading}
              >
                <Icon name={loading ? 'loading' : 'location'} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
              </button>
            }
          />
        </FormField>
      </form>
      {error && (
        <Alert tone="danger" title="Pencarian lokasi tidak tersedia">
          {error}
        </Alert>
      )}
      <div
        id={`${id}-results`}
        className="flex flex-col gap-3"
        aria-busy={loading}
      >
        {results.map((result) => (
          <div key={result.id} className="flex items-center gap-4 rounded-md border border-border p-4 [&>div]:min-w-0 [&>div]:flex-1 [&>div]:wrap-anywhere [&>div]:flex [&>div]:flex-col [&>div]:gap-1">
            <div>
              <strong>{result.label}</strong>
              {result.latitude != null && result.longitude != null && (
                <p className="m-0 text-sm leading-[1.5] text-muted">
                  Koordinat: {result.latitude}, {result.longitude}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              className="h-11 min-w-19 py-0"
              aria-pressed={selectedId === result.id}
              onClick={() => onSelect(result)}
            >
              {selectedId === result.id ? 'Terpilih' : 'Pilih'}
            </Button>
          </div>
        ))}
      </div>
      {searched && !loading && !error && results.length === 0 && (
        <p role="status" className="m-0 text-sm leading-[1.5] text-muted">
          Lokasi tidak ditemukan. Coba alamat lain.
        </p>
      )}
      {attribution && <p className="m-0 text-xs text-muted">{attribution}</p>}
    </section>
  )
}
