import { useId } from 'react'

export default function Checkbox({
  label,
  id: suppliedId,
  className = '',
  ...props
}) {
  const generatedId = useId()
  const id = suppliedId || generatedId
  return (
    <label className={`fr-checkbox ${className}`} htmlFor={id}>
      <input {...props} id={id} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
