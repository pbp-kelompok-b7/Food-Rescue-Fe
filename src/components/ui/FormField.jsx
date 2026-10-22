import { cloneElement, useId } from 'react'

// Wrap exactly one input-like component; its id and ARIA attributes are connected here.
export default function FormField({
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
}) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  const messageId = `${id}-message`
  const describedBy =
    [children.props['aria-describedby'], (error || hint) && messageId]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div className={`fr-field ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && ' (wajib)'}
      </label>
      {cloneElement(children, {
        id,
        required: required || children.props.required,
        'aria-invalid': error ? true : children.props['aria-invalid'],
        'aria-describedby': describedBy,
      })}
      {(error || hint) && (
        <p id={messageId} className={error ? 'fr-field-error' : 'fr-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
