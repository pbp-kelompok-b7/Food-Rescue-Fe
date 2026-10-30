import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import AreaAutocomplete from './AreaAutocomplete.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers()
})
const place = { label: 'Depok, West Java, Indonesia', area: 'Depok', latitude: -6.4, longitude: 106.8, attribution: 'OSM' }
async function mount() {
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<form onSubmit={event => event.preventDefault()}><AreaAutocomplete /><button type="submit">Cari</button></form>))
}
async function type(value: string) {
  const input = container.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function advance() { await act(async () => { await vi.advanceTimersByTimeAsync(1200) }) }

it('shows suggestions after a pause, selects an area, and submits the area instead of the full place label', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn<(url: string, options: RequestInit) => Promise<Response>>(async () => Response.json({ success: true, data: { results: [place] } }))
  vi.stubGlobal('fetch', fetch)
  await mount()
  await type('d'); await advance(); expect(fetch).not.toHaveBeenCalled()
  await type('de'); expect(fetch).not.toHaveBeenCalled()
  await advance()
  expect(fetch).toHaveBeenCalledOnce()
  expect(fetch.mock.calls[0]?.[0]).toContain('/locations/suggestions/?q=de')
  expect(container.querySelector('[role="option"]')?.textContent).toContain(place.label)
  await act(async () => container.querySelector<HTMLButtonElement>('[role="option"]')!.click())
  expect(container.querySelector('input')?.value).toBe('Depok')
  expect(new FormData(container.querySelector('form')!).get('area')).toBe('Depok')
  expect(container.querySelector('[role="listbox"]')).toBeNull()
})

it('ignores a stale request after editing and supports keyboard selection', async () => {
  vi.useFakeTimers()
  let resolveOld!: (value: Response) => void
  const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve }))
    .mockResolvedValue(Response.json({ success: true, data: { results: [place] } }))
  vi.stubGlobal('fetch', fetch)
  await mount(); await type('jak'); await advance(); await type('dep'); await advance()
  await act(async () => resolveOld(Response.json({ success: true, data: { results: [{ ...place, label: 'Stale Jakarta' }] } })))
  expect(container.textContent).not.toContain('Stale Jakarta')
  const input = container.querySelector('input')!
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
  expect(input.value).toBe('Depok')
  expect(container.querySelector('[role="listbox"]')).toBeNull()
})

it('keeps manual area filtering usable when suggestions fail', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network failure')))
  await mount(); await type('Depok'); await advance()
  expect(container.textContent).toContain('Saran lokasi belum dapat dimuat')
  expect(new FormData(container.querySelector('form')!).get('area')).toBe('Depok')
})
