import type * as React from 'react'
import Icon from './Icon.tsx'

const variants = {
  primary: '',
  secondary: 'not-disabled:border not-disabled:border-outline not-disabled:bg-surface not-disabled:text-ink not-disabled:shadow-none hover:not-disabled:bg-organic active:not-disabled:bg-primary-container active:not-disabled:opacity-100',
  ghost: 'not-disabled:bg-transparent not-disabled:text-primary-hover not-disabled:shadow-none hover:not-disabled:bg-organic active:not-disabled:bg-primary-container active:not-disabled:opacity-100',
  destructive: 'not-disabled:bg-danger not-disabled:shadow-none hover:not-disabled:bg-danger-hover active:not-disabled:bg-danger-active active:not-disabled:opacity-100',
  brand: 'not-disabled:bg-brand not-disabled:text-on-brand not-disabled:shadow-none hover:not-disabled:bg-brand-hover active:not-disabled:bg-brand-active active:not-disabled:opacity-100',
}

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
      className={`fr-button ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Icon name="loading" className="animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  )
}
