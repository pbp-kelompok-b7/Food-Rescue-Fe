import type * as React from 'react'
import Badge from '../ui/Badge.tsx'

export default function PickupStatus({
  status,
  label,
  tone,
  scheduledAt,
  location,
  instructions,
  children,
  actions,
}: { status: string; label?: string; tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger'; scheduledAt?: string; location?: string; instructions?: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-md border border-border bg-surface wrap-anywhere p-4 nav:p-6 [&_dl]:m-0 [&_dl]:flex [&_dl]:flex-col [&_dl]:gap-4 [&_dt]:mb-1 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:m-0 [&>span]:mb-4 [&>[role]]:mt-4">
      <h2>Status pickup</h2>
      <Badge status={status} tone={tone}>
        {label}
      </Badge>
      <dl>
        {scheduledAt && (
          <div>
            <dt>Waktu pickup</dt>
            <dd>{scheduledAt}</dd>
          </div>
        )}
        {location && (
          <div>
            <dt>Lokasi pickup</dt>
            <dd>{location}</dd>
          </div>
        )}
        {instructions && (
          <div>
            <dt>Instruksi pickup</dt>
            <dd>{instructions}</dd>
          </div>
        )}
      </dl>
      {children}
      {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
    </section>
  )
}
