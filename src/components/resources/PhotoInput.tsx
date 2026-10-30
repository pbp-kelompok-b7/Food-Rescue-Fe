import { useEffect, useRef, useState } from 'react'
import { photoError, photoUrl } from '../../services/photos.ts'
import FormField from '../ui/FormField.tsx'
import Button from '../ui/Button.tsx'

export default function PhotoInput({ value, existing, onChange, error }: {
  value?: File | null; existing?: string | null; onChange: (image: File | null | undefined) => void; error?: string
}) {
  const preview = useRef<HTMLImageElement>(null)
  const [invalid, setInvalid] = useState<string>()
  useEffect(() => {
    if (!value) return
    const url = URL.createObjectURL(value)
    if (preview.current) preview.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [value])
  const src = value === null ? '' : existing ? photoUrl(existing) : ''
  return <section className="flex min-w-0 flex-col gap-3" aria-label="Foto resource">
    <FormField label="Foto (opsional)" hint="JPG, PNG, atau WebP. Maksimal 5 MB." error={invalid || error}>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="min-h-11 w-full min-w-0 rounded-md border border-border p-3 text-sm file:mr-3 file:cursor-pointer" onChange={event => {
        const file = event.target.files?.[0]
        if (!file) return
        const message = photoError(file)
        setInvalid(message)
        if (!message) onChange(file)
        event.target.value = ''
      }} />
    </FormField>
    {value && <p role="status" className="m-0 text-sm wrap-anywhere">Foto dipilih: {value.name}</p>}
    {(value || src) && <div className="flex flex-col items-start gap-2"><img ref={preview} src={value ? undefined : src} alt="Preview foto resource" className="max-h-64 max-w-full rounded-md object-contain" /><Button variant="secondary" onClick={() => { setInvalid(undefined); onChange(null) }}>Hapus foto</Button></div>}
    {value === null && existing && <Button variant="ghost" className="self-start" onClick={() => onChange(undefined)}>Pulihkan foto</Button>}
  </section>
}
