import { useId } from 'react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'

export default function SearchBar({
  value,
  onChange,
  onSearch,
  label = 'Cari resource',
  placeholder = 'Cari pangan…',
  loading = false,
}) {
  const id = useId()
  return (
    <form
      className="fr-search"
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
