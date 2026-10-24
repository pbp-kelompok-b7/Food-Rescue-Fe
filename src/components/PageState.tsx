import type * as React from 'react'
import EmptyState from './ui/EmptyState.tsx'
import ErrorState from './ui/ErrorState.tsx'

export default function PageState({ title, children, action, error = false }: { title: string; children?: React.ReactNode; action?: React.ReactNode; error?: boolean }) {
  if (error) return <ErrorState title={title}>{children}{action && <div className="mt-6">{action}</div>}</ErrorState>
  return (
    <EmptyState title={title} action={action}><p>{children}</p></EmptyState>
  )
}
