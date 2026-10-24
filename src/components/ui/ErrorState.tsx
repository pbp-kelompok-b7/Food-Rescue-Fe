import type * as React from 'react'
import Button from './Button.tsx'
import Icon from './Icon.tsx'

export default function ErrorState({
  title,
  children = 'Periksa koneksi dan coba lagi.',
  onRetry,
  loading = false,
}: { title?: string; children?: React.ReactNode; onRetry?: () => void; loading?: boolean }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-md border-l-4 border-danger bg-surface p-4 text-notice [&_h2]:m-0 [&_h2]:font-semibold" role="alert">
      <Icon name="error" />
      {title && <h2>{title}</h2>}
      <div>{children}</div>
      {onRetry && (
        <Button variant="secondary" className="h-11 py-0" onClick={onRetry} loading={loading}>
          Coba lagi
        </Button>
      )}
    </section>
  )
}
