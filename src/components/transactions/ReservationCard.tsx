import type * as React from 'react'
import { Link } from 'react-router'
import Badge from '../ui/Badge.tsx'

export default function ReservationCard({
  reference,
  title,
  status,
  quantity,
  unit,
  counterpart,
  pickupTime,
  to,
  actions,
}: { reference?: string; title: string; status: string; quantity: number; unit: string; counterpart?: string; pickupTime?: string; to?: string; actions?: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-surface wrap-anywhere [&_h2]:m-0 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-semibold flex flex-col items-start gap-3 p-5 [&_p]:m-0">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        {reference && <span className="m-0 text-sm leading-[1.5] text-muted">{reference}</span>}
        <Badge status={status} />
      </div>
      <h2>{to ? <Link to={to}>{title}</Link> : title}</h2>
      <p>
        {quantity} {unit}
      </p>
      {counterpart && <p className="m-0 text-sm leading-[1.5] text-muted">{counterpart}</p>}
      {pickupTime && <p className="m-0 text-sm leading-[1.5] text-muted">Pickup: {pickupTime}</p>}
      {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
    </article>
  )
}
