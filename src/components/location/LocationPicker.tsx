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
    <section className="fr-location-picker" aria-label="Pemilihan lokasi">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSearch?.(query)
        }}
      >
        <FormField
          label="Cari alamat / lokasi"
          hint="Pilih hasil di bawah untuk mengonfirmasi lokasi."
        >
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-controls={`${id}-results`}
          />
        </FormField>
        <Button type="submit" variant="secondary" loading={loading}>
          <Icon name="location" />
          Cari lokasi
        </Button>
      </form>
      {error && (
        <Alert tone="danger" title="Pencarian lokasi tidak tersedia">
          {error}
        </Alert>
      )}
      <div
        id={`${id}-results`}
        className="fr-location-results"
        aria-busy={loading}
      >
        {results.map((result) => (
          <div key={result.id} className="fr-location-result">
            <div>
              <strong>{result.label}</strong>
              {result.latitude != null && result.longitude != null && (
                <p className="fr-hint">
                  Koordinat: {result.latitude}, {result.longitude}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              aria-pressed={selectedId === result.id}
              onClick={() => onSelect(result)}
            >
              {selectedId === result.id ? 'Terpilih' : 'Pilih'}
            </Button>
          </div>
        ))}
      </div>
      {searched && !loading && !error && results.length === 0 && (
        <p role="status" className="fr-hint">
          Lokasi tidak ditemukan. Coba alamat lain.
        </p>
      )}
      {attribution && <p className="fr-attribution">{attribution}</p>}
    </section>
  )
}
