import type * as React from 'react'
import Icon from './Icon.tsx'

export default function EmptyState({
  title = 'Belum ada resource',
  children,
  action,
  variant = 'default',
}: { title?: string; children?: React.ReactNode; action?: React.ReactNode; variant?: 'default' | 'dashboard' }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-md border border-border bg-surface p-6 shadow-card [&_h2]:m-0 [&_h2]:font-semibold [&_p]:m-0">
      <Icon name={variant === 'dashboard' ? 'dashboard' : 'empty'} />
      <h2>{title}</h2>
      {children && <div>{children}</div>}
      {action}
    </section>
  )
}
