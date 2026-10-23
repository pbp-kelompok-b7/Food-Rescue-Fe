import type * as React from 'react'
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
      className={`fr-badge fr-badge--${tone || (status ? tones[status] : undefined) || 'neutral'} ${className}`}
    >
      {children || status}
    </span>
  )
}
