import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import ResourceFields, { ResourceFieldControls } from './ResourceFields.tsx'
import { emptyResourceFields, resourceFieldsPayload, validateResourceFields } from './resourceFields.ts'
import LocationSearch from '../location/LocationSearch.tsx'
import { locationPayload, type LocationResult, type ReferenceData } from '../../services/reference.ts'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
const food = 'PACKAGED_FOOD_SURPLUS'
const waste = 'COMPOSTABLE_FOOD_WASTE'
const references: ReferenceData = {
  categories: [{ code: 'prepared_meal', label: 'Makanan siap konsumsi', resource_type: food }, { code: 'coffee_grounds', label: 'Ampas kopi', resource_type: waste }],
  units: [{ code: 'pcs', label: 'Buah', allows_decimal: false, max_decimal_places: 0 }, { code: 'kg', label: 'Kilogram', allows_decimal: true, max_decimal_places: 3 }],
  resource_types: [{ code: food, label: 'Surplus makanan' }, { code: waste, label: 'Limbah organik' }],
  suitabilities: [{ code: 'HUMAN_CONSUMPTION', label: 'Konsumsi manusia' }, { code: 'COMPOSTING', label: 'Kompos' }],
  modes: [{ code: 'DONATE', label: 'Donasi' }, { code: 'SELL', label: 'Dijual' }],
}
const location: LocationResult = { label: 'Kampus UI Depok', area: 'Depok', latitude: -6.36, longitude: 106.82, attribution: '© OpenStreetMap contributors' }
function ok(data: unknown) { return Response.json({ success: true, data }) }
async function mount(element: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(element))
}
async function input(selector: string, value: string) {
  const element = container.querySelector<HTMLInputElement>(selector)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function select(name: string, value: string) {
  const element = container.querySelector<HTMLSelectElement>(`[name="${name}"]`)!
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function click(text: string) {
  const element = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text || item.getAttribute('aria-label') === text)!
  await act(async () => element.click())
}
function Picker({ submit = () => {} }: { submit?: () => void }) {
  const [value, setValue] = useState<LocationResult | null>(null)
  return <form onSubmit={event => { event.preventDefault(); submit() }}><LocationSearch value={value} onChange={setValue} /><output>{value ? JSON.stringify({ ...locationPayload(value), attribution: value.attribution }) : 'Tidak ada pilihan'}</output></form>
}
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('searches manually, rejects short input, and selects a complete location without submitting the parent form', async () => {
  const submit = vi.fn()
  const fetchMock = vi.fn<(url: string, options: RequestInit) => Promise<Response>>(async () => ok({ results: [location] }))
  vi.stubGlobal('fetch', fetchMock)
  await mount(<Picker submit={submit} />)
  await input('[type="search"]', 'ab')
  await click('Cari lokasi')
  expect(fetchMock).not.toHaveBeenCalled()
  expect(container.textContent).toContain('Tulis alamat yang lebih lengkap')
  await input('[type="search"]', 'Kampus UI')
  await input('[placeholder="Contoh: Depok"]', 'Depok')
  expect(fetchMock).not.toHaveBeenCalled()
  await click('Cari lokasi')
  expect(fetchMock).toHaveBeenCalledOnce()
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain('q=Kampus+UI&limit=5&area=Depok')
  await click('Pilih')
  expect(container.querySelector('output')?.textContent).toContain('"latitude":-6.36')
  expect(container.textContent).toContain(location.attribution)
  expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe('Terpilih')
  expect(container.querySelector('iframe[title="Peta lokasi terpilih"]')?.getAttribute('src')).toContain('marker=-6.36,106.82')
  expect(container.querySelectorAll('form')).toHaveLength(1)
  expect(submit).not.toHaveBeenCalled()
  await input('[type="search"]', 'Alamat lain')
  expect(container.querySelector('output')?.textContent).toBe('Tidak ada pilihan')
})

it('ignores an old response after the user changes the query and blocks duplicate search', async () => {
  let resolveOld!: (response: Response) => void
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve })).mockResolvedValueOnce(ok({ results: [] }))
  vi.stubGlobal('fetch', fetchMock)
  await mount(<Picker />)
  await input('[type="search"]', 'Alamat lama')
  await click('Cari lokasi')
  await click('Cari lokasi')
  expect(fetchMock).toHaveBeenCalledOnce()
  await input('[type="search"]', 'Alamat baru')
  await click('Cari lokasi')
  await act(async () => resolveOld(ok({ results: [location] })))
  expect(container.textContent).toContain('Lokasi tidak ditemukan')
  expect(container.textContent).not.toContain('Kampus UI Depok')
})

it('honors a 429 Retry-After cooldown even after editing the query', async () => {
  vi.useFakeTimers()
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ success: false }, { status: 429, headers: { 'Retry-After': '2' } })).mockResolvedValueOnce(ok({ results: [location] }))
  vi.stubGlobal('fetch', fetchMock)
  await mount(<Picker />)
  await input('[type="search"]', 'Kampus UI')
  await click('Cari lokasi')
  expect(container.textContent).toContain('Coba lagi dalam 2 detik')
  await click('Coba lagi dalam 2 detik')
  expect(fetchMock).toHaveBeenCalledOnce()
  await input('[type="search"]', 'Depok')
  await click('Cari lokasi')
  expect(fetchMock).toHaveBeenCalledOnce()
  await act(async () => vi.advanceTimersByTime(2000))
  await click('Cari lokasi')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it.each([501, 502, 503])('shows a safe retry for location service failure %s', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ success: false, message: 'Private upstream trace' }, { status })).mockResolvedValueOnce(ok({ results: [location] })))
  await mount(<Picker />)
  await input('[type="search"]', 'Kampus UI')
  await click('Cari lokasi')
  expect(container.textContent).toContain('Pencarian lokasi tidak tersedia')
  expect(container.textContent).not.toContain('Private upstream trace')
  await click('Coba lagi')
  expect(container.textContent).toContain(location.label)
})

it('loads reference options from the API and retries after a reference failure', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ success: false }, { status: 501 })).mockResolvedValueOnce(ok(references))
  vi.stubGlobal('fetch', fetchMock)
  await mount(<ResourceFields kind="supply" value={emptyResourceFields} onChange={() => {}} />)
  expect(container.textContent).toContain('Pilihan resource belum tersedia')
  expect(container.querySelector('select')).toBeNull()
  await click('Coba lagi')
  expect(container.textContent).toContain('Surplus makanan')
  expect(container.textContent).not.toContain('prepared_meal')
})

it.each(['supply', 'request', 'offer'] as const)('resets incompatible fields and prepares string payloads for %s', async kind => {
  let current = { ...emptyResourceFields, resource_type: food, category: 'prepared_meal', unit: 'kg', suitability: ['HUMAN_CONSUMPTION'], intended_use: 'HUMAN_CONSUMPTION', mode: 'DONATE', unit_price: '0.00', quantity: '1.500', deadline: '2099-01-02T13:30' }
  function Fields() {
    const [value, setValue] = useState(current)
    return <ResourceFieldControls data={references} kind={kind} value={value} onChange={next => { current = next; setValue(next) }} />
  }
  await mount(<Fields />)
  expect(validateResourceFields(current, references, kind)).toEqual({})
  const initial = resourceFieldsPayload(current, references, kind)
  expect(initial[kind === 'supply' ? 'quantity_total' : kind === 'request' ? 'quantity_needed' : 'quantity']).toBe('1.500')
  expect(initial[kind === 'supply' ? 'available_until' : kind === 'request' ? 'valid_until' : 'resource_deadline']).toBe('2099-01-02T13:30:00+07:00')
  await select('resource_type', waste)
  expect(current.category).toBe('')
  expect(current.suitability).toEqual([])
  expect(current.intended_use).toBe('')
  expect(container.textContent).not.toContain('Konsumsi manusia')
  expect(container.textContent).toContain('Kompos')
  expect(container.querySelector('[name="category"]')?.textContent).toContain('Ampas kopi')
  expect(validateResourceFields(current, references, kind).category).toBeDefined()
  await select('unit', 'pcs')
  expect(validateResourceFields(current, references, kind).quantity).toBe('Jumlah harus bilangan bulat.')
  if (kind !== 'request') {
    await select('mode', 'SELL')
    await input('[name="unit_price"]', '20000.50')
    expect(current.unit_price).toBe('20000.50')
    await select('mode', 'DONATE')
    expect(current.unit_price).toBe('0.00')
    expect(container.querySelector('[name="unit_price"]')).toBeNull()
  }
})
