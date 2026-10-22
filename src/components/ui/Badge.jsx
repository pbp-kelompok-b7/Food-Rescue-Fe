const tones = {
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

export default function Badge({ status, tone, children, className = '' }) {
  return (
    <span
      className={`fr-badge fr-badge--${tone || tones[status] || 'neutral'} ${className}`}
    >
      {children || status}
    </span>
  )
}
