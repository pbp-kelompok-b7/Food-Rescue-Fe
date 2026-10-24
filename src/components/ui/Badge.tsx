import type * as React from 'react'
const toneClasses = {
  neutral: 'bg-neutral-container text-notice',
  success: 'bg-primary-container text-ink',
  info: 'bg-surface-variant text-ink',
  warning: 'bg-warning-container text-on-warning-container',
  danger: 'bg-danger-container text-on-danger-container',
}
const tones: Record<string, 'neutral' | 'success' | 'info' | 'warning' | 'danger'> = {
  AVAILABLE: 'success',
  COMPLETED: 'success',
  OPEN: 'success',
  FULFILLED: 'success',
  RESERVED: 'info',
  ALLOCATED: 'info',
  PENDING: 'info',
  ACCEPTED: 'success',
  EXPIRED: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  CLOSED: 'neutral',
}

export default function Badge({ status, tone, children, className = '' }: { status?: string; tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger'; children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center self-start rounded-md px-2 py-1 text-xs leading-4 font-semibold wrap-anywhere ${!tone && status === 'CLOSED' ? 'bg-neutral-container text-ink' : toneClasses[tone || (status ? tones[status] : undefined) || 'neutral']} ${className}`}
    >
      {children || status}
    </span>
  )
}
