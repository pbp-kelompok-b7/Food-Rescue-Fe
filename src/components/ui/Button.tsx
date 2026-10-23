import type * as React from 'react'
import Icon from './Icon.tsx'

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}: React.ComponentPropsWithRef<'button'> & { variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'brand'; loading?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      className={`fr-button fr-button--${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Icon name="loading" className="fr-spinner" />}
      {children}
    </button>
  )
}
