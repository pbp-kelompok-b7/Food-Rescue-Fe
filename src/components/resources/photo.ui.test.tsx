import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import PhotoInput from './PhotoInput.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
afterEach(async () => {
  await act(async () => root?.unmount())
  container?.remove()
  vi.restoreAllMocks()
})

it('previews a selected photo, rejects unsupported files, and revokes the preview after removal', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo-preview')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  function Form() {
    const [photo, setPhoto] = useState<File | null>()
    return <PhotoInput value={photo} onChange={setPhoto} />
  }
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(<Form />))
  const input = container.querySelector('input')!
  async function choose(file: File) {
    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  await choose(new File(['unsafe'], 'test.svg', { type: 'image/svg+xml' }))
  expect(container.textContent).toContain('Gunakan foto JPG, PNG, atau WebP.')
  expect(create).not.toHaveBeenCalled()
  await choose(new File(['png'], 'test.png', { type: 'image/png' }))
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:photo-preview')
  await act(async () => container.querySelector('button')!.click())
  expect(container.querySelector('img')).toBeNull()
  expect(revoke).toHaveBeenCalledWith('blob:photo-preview')
})
