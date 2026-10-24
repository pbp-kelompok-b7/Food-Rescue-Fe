import { useId } from 'react'
import Button from '../ui/Button.tsx'
import Input from '../ui/Input.tsx'

export default function SearchBar({
  value,
  onChange,
  onSearch,
  label = 'Cari resource',
  placeholder = 'Cari pangan…',
  loading = false,
}: { value: string; onChange: (value: string) => void; onSearch?: (value: string) => void; label?: string; placeholder?: string; loading?: boolean }) {
  const id = useId()
  return (
    <form
      className="flex gap-3"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch?.(value)
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <Button type="submit" loading={loading}>
        Cari
      </Button>
    </form>
  )
}
