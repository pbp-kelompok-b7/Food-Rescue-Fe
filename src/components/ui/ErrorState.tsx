import type * as React from 'react'
import Button from './Button.tsx'
import Icon from './Icon.tsx'

export default function ErrorState({
  title = 'Gagal memuat data',
  children = 'Periksa koneksi dan coba lagi.',
  onRetry,
  loading = false,
}: { title?: string; children?: React.ReactNode; onRetry?: () => void; loading?: boolean }) {
  return (
    <section className="fr-error" role="alert">
      <Icon name="error" />
      <h2>{title}</h2>
      <div>{children}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} loading={loading}>
          Coba lagi
        </Button>
      )}
    </section>
  )
}
