import type * as React from 'react'
import { cloneElement, useId } from 'react'

// Wrap exactly one input-like component; its id and ARIA attributes are connected here.
export default function FormField({
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
}: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactElement<{ id?: string; required?: boolean; 'aria-invalid'?: React.AriaAttributes['aria-invalid']; 'aria-describedby'?: string }>; className?: string }) {
  const generatedId = useId()
  const id = children.props.id || generatedId
  const messageId = `${id}-message`
  const describedBy =
    [children.props['aria-describedby'], (error || hint) && messageId]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div className={`flex min-w-0 flex-col gap-2 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold ${className}`}>
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
        <p id={messageId} className={error ? 'm-0 text-sm leading-5 text-danger' : 'm-0 text-sm leading-5 text-muted'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
