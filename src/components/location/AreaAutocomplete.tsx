import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { suggestLocations, type LocationResult } from '../../services/reference.ts'
import FormField from '../ui/FormField.tsx'
import Input from '../ui/Input.tsx'

export default function AreaAutocomplete({ initial = '', placeholder = 'Ketik kota atau area' }: { initial?: string; placeholder?: string }) {
  const id = useId()
  const [value, setValue] = useState(initial)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [state, setState] = useState<{ query: string; results: LocationResult[]; error?: string }>({ query: '', results: [] })
  const revision = useRef(0)
  const [pending, setPending] = useState(false)
  const query = value.trim()
  const results = state.query === query ? state.results : []
  const error = state.query === query ? state.error : undefined
  useEffect(() => {
    if (!open || query.length < 2) return
    const controller = new AbortController()
    const current = ++revision.current
    // One deliberate pause between keystrokes; no polling or automatic retries.
    const timer = setTimeout(async () => {
      setPending(true)
      try {
        const response = await suggestLocations(query, { signal: controller.signal })
        if (!controller.signal.aborted && current === revision.current) setState({ query, results: response.results })
      } catch (failure) {
        if (!controller.signal.aborted && current === revision.current) setState({ query, results: [], error: failure instanceof ApiError && failure.status === 429
          ? 'Pencarian sedang dibatasi. Tunggu sebentar, lalu ketik ulang area.'
          : 'Saran lokasi belum dapat dimuat. Kamu tetap bisa mengisi nama area.' })
      } finally {
        if (!controller.signal.aborted && current === revision.current) setPending(false)
      }
    }, 1200)
    return () => { clearTimeout(timer); controller.abort(); revision.current += 1 }
  }, [query, open])
  function choose(result: LocationResult) {
    setValue(result.area)
    setOpen(false)
    setActive(-1)
    setPending(false)
  }
  const show = open && query.length >= 2
  return <div className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setPending(false); setActive(-1) }
  }}>
    <FormField label="Area">
      <Input name="area" value={value} maxLength={100} placeholder={placeholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={show} aria-controls={`${id}-options`} aria-activedescendant={show && active >= 0 && results[active] ? `${id}-${active}` : undefined}
        onFocus={() => setOpen(true)} onChange={event => { setValue(event.target.value); setOpen(true); setActive(-1); setPending(false) }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setPending(false) }
          if (show && results.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            setActive(current => event.key === 'ArrowDown' ? (current + 1) % results.length : (current <= 0 ? results.length : current) - 1)
          }
          if (event.key === 'Enter' && show && results[active]) { event.preventDefault(); choose(results[active]) }
        }} />
    </FormField>
    {show && <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-surface shadow-card">
      <div role="status" className="px-3 py-2 text-sm text-muted">{pending ? 'Mencari lokasi…' : error || (state.query !== query ? 'Menunggu selesai mengetik…' : results.length ? 'Pilih area dari lokasi berikut.' : 'Lokasi tidak ditemukan. Coba nama yang lebih lengkap.')}</div>
      <div id={`${id}-options`} role="listbox" aria-label="Saran area">
        {results.map((result, index) => <button id={`${id}-${index}`} type="button" role="option" aria-selected={active === index} key={`${result.latitude}:${result.longitude}:${index}`} className={`flex min-h-11 w-full flex-col gap-1 border-0 px-3 py-3 text-left text-sm hover:bg-supply-container ${active === index ? 'bg-supply-container' : ''}`} onMouseDown={event => event.preventDefault()} onClick={() => choose(result)}><strong>{result.area}</strong><span className="wrap-anywhere text-muted">{result.label}</span></button>)}
      </div>
      {results.length > 0 && <p className="m-0 px-3 py-2 text-xs text-muted">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p>}
    </div>}
  </div>
}
