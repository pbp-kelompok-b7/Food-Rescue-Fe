import type * as React from 'react'
import { Link } from 'react-router'
import Icon from '../ui/Icon.tsx'
import Badge from '../ui/Badge.tsx'

export default function SupplyCard({
  title,
  resourceType = 'packaged',
  mode = 'DONATE',
  quantity,
  unitPrice,
  status,
  unit,
  deadline,
  area,
  intendedUse,
  condition,
  photoUrl,
  photoAlt = '',
  to,
  action,
}: { title: string; resourceType?: 'packaged' | 'organic'; mode?: 'DONATE' | 'SELL'; quantity: number | string; unitPrice?: string; status?: { code: string; label: string }; unit: string; deadline?: string; area?: string; intendedUse?: string; condition?: string; photoUrl?: string; photoAlt?: string; to?: string; action?: React.ReactNode }) {
  const organic = resourceType === 'organic'
  const sell = mode === 'SELL'
  return (
    <article
      className="min-w-0 overflow-hidden rounded-md border border-border bg-surface shadow-card wrap-anywhere [&_h2]:m-0 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-semibold"
    >
      <div className={`flex items-center gap-2 px-5 text-sm leading-[1.333] font-semibold ${organic ? 'min-h-13 bg-organic py-2.5 text-on-organic' : 'min-h-20 bg-brand py-5 text-on-brand'}`}>
        <Icon name={organic ? 'organicLarge' : 'packageLarge'} />
        <span>{organic ? 'Bahan organik' : 'Siap konsumsi'}</span>
      </div>
      {photoUrl && (
        <img
          className="block h-40 w-full object-cover"
          src={photoUrl}
          alt={photoAlt}
          loading="lazy"
        />
      )}
      <div className="flex flex-col items-start gap-5 p-5 [&_p]:m-0 [&>.fr-button]:h-11 [&>.fr-button]:w-full [&>.fr-button]:py-0">
        <div className="flex w-full flex-col items-start gap-3">
          <div
            className={`inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-xs leading-4 font-semibold ${sell ? 'bg-sell text-white' : 'bg-primary-container text-on-primary-container'}`}
          >
            <Icon name={sell ? 'sell' : 'donate'} />
            {sell ? 'Jual' : 'Donasi'}
          </div>
          <h2>{title}</h2>
          {status && <Badge status={status.code}>{status.label}</Badge>}
          {sell && unitPrice && <p className="text-sm font-semibold">{unitPrice} / {unit}</p>}
          <p className="text-lg font-semibold">
            {quantity} {unit} tersedia
          </p>
          <div className="flex w-full flex-col gap-2.5 border-t border-border pt-3 [&_p]:flex [&_p]:items-start [&_p]:gap-2 [&_p]:text-sm [&_p]:leading-5">
            {deadline && (
              <p className="text-ink">
                <Icon name="clock" />
                <span>
                  {organic ? 'Batas tersedia' : 'Batas konsumsi'}: {deadline}
                </span>
              </p>
            )}
            {area && (
              <p className="text-muted">
                <Icon name="pin" />
                <span>{area}</span>
              </p>
            )}
          </div>
          {intendedUse && (
            <span className="inline-flex items-center gap-1 self-start rounded-sm bg-neutral-container px-2 py-1 text-xs leading-4 font-semibold text-notice">
              <Icon name={organic ? 'compost' : 'food'} />
              {intendedUse}
            </span>
          )}
          {condition && <p className="m-0 text-sm leading-5 text-notice">{condition}</p>}
        </div>
        {to && (
          <Link to={to} className="fr-button border border-outline bg-surface text-ink shadow-none hover:not-disabled:bg-organic active:not-disabled:bg-primary-container active:not-disabled:opacity-100">
            Lihat detail →<span className="sr-only"> {title}</span>
          </Link>
        )}
        {action}
      </div>
    </article>
  )
}
