import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { searchLocations, type LocationResult } from '../../services/reference.ts'
import LocationPicker from './LocationPicker.tsx'
import Button from '../ui/Button.tsx'

function searchError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Terlalu banyak pencarian. Tunggu sebentar sebelum mencoba lagi.'
    if (error.status === 502) return 'Penyedia pencarian lokasi sedang bermasalah. Coba lagi nanti.'
    if (error.status === 503 || error.status === 501) return 'Layanan pencarian lokasi belum tersedia. Coba lagi nanti.'
    if (error.status === 400) return 'Periksa alamat dan area pencarian.'
  }
  return 'Lokasi belum dapat dimuat. Periksa koneksi dan coba lagi.'
}

export default function LocationSearch({ value, onChange, limit = 5, disabled = false, error: fieldError }: {
  value: LocationResult | null; onChange: (value: LocationResult | null) => void; limit?: number; disabled?: boolean; error?: string
}) {
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string>()
  const [queryError, setQueryError] = useState<string>()
  const [areaError, setAreaError] = useState<string>()
  const [retryAt, setRetryAt] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const pending = useRef<AbortController | null>(null)
  const revision = useRef(0)

  useEffect(() => () => { revision.current += 1; pending.current?.abort() }, [])
  useEffect(() => {
    if (!retryAt) return
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
      setRemaining(seconds)
      if (!seconds) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAt])

  function edit(nextQuery: string, nextArea: string) {
    revision.current += 1
    pending.current?.abort()
    pending.current = null
    setQuery(nextQuery)
    setArea(nextArea)
    setResults([])
    setLoading(false)
    setSearched(false)
    setError(undefined)
    setQueryError(undefined)
    setAreaError(undefined)
    onChange(null)
  }

  async function search() {
    if (disabled || pending.current || Date.now() < retryAt) return
    const q = query.trim()
    const region = area.trim()
    setQueryError(q.length < 3 ? 'Tulis alamat yang lebih lengkap.' : q.length > 200 ? 'Alamat terlalu panjang.' : undefined)
    setAreaError(region.length > 100 ? 'Nama area terlalu panjang.' : undefined)
    if (q.length < 3 || q.length > 200 || region.length > 100) return
    const current = ++revision.current
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setSearched(true)
    setResults([])
    setError(undefined)
    onChange(null)
    try {
      const response = await searchLocations({ q, area: region || undefined, limit }, { signal: controller.signal })
      if (current === revision.current && !controller.signal.aborted) setResults(response.results)
    } catch (failure) {
      if (current !== revision.current || controller.signal.aborted) return
      setError(searchError(failure))
      if (failure instanceof ApiError && failure.status === 429) {
        const seconds = failure.retryAfter ?? 60
        setRetryAt(Date.now() + seconds * 1000)
        setRemaining(seconds)
      }
    } finally {
      if (current === revision.current && !controller.signal.aborted) {
        pending.current = null
        setLoading(false)
      }
    }
  }

  const attribution = [...new Set([...results.map(item => item.attribution), ...(value ? [value.attribution] : [])])].join(' · ')
  return <fieldset disabled={disabled} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
    <legend className="sr-only">Lokasi resource</legend>
    <LocationPicker query={query} onQueryChange={next => edit(next, area)} area={area} onAreaChange={next => edit(query, next)} onSearch={() => void search()} results={results} selected={value} onSelect={onChange} loading={loading} searched={searched} error={error} queryError={queryError} areaError={areaError} attribution={attribution} searchDisabled={disabled || remaining > 0} onRetry={() => void search()} retryLabel={remaining > 0 ? `Coba lagi dalam ${remaining} detik` : 'Coba lagi'} />
    {remaining > 0 && !error && <p role="status" className="m-0 text-sm text-muted">Pencarian dapat dicoba lagi dalam {remaining} detik.</p>}
    {value && <div className="flex min-w-0 flex-col gap-2 text-sm"><p role="status" className="m-0 wrap-anywhere">Lokasi terpilih: <strong>{value.label}</strong> · {value.area}</p><Button className="self-start" variant="ghost" onClick={() => onChange(null)}>Hapus pilihan lokasi</Button></div>}
    {fieldError && <p role="alert" className="m-0 text-sm text-danger">{fieldError}</p>}
  </fieldset>
}
