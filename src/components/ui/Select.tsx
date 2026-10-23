import type * as React from 'react'
export default function Select({
  options = [],
  placeholder,
  children,
  className = '',
  ...props
}: React.ComponentPropsWithRef<'select'> & { options?: {value: string; label: string; disabled?: boolean}[]; placeholder?: string }) {
  return (
    <select {...props} className={`fr-control fr-select ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
      {children}
    </select>
  )
}
