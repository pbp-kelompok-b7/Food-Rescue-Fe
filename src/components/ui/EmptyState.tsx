import type * as React from 'react'
import Icon from './Icon.tsx'

export default function EmptyState({
  title = 'Belum ada resource',
  children,
  action,
  variant = 'default',
}: { title?: string; children?: React.ReactNode; action?: React.ReactNode; variant?: 'default' | 'dashboard' }) {
  return (
    <section className="fr-empty">
      <Icon name={variant === 'dashboard' ? 'dashboard' : 'empty'} />
      <h2>{title}</h2>
      {children && <div>{children}</div>}
      {action}
    </section>
  )
}
