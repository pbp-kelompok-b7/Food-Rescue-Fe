import { Link } from 'react-router'
import Icon from '../ui/Icon.tsx'

export default function RequestCard({
  title,
  resourceType = 'packaged',
  remaining,
  total,
  allocated,
  fulfilled,
  unit,
  budgetHint,
  deadline,
  intendedUse,
  area,
  status = 'OPEN',
  category,
  showCounters = false,
  to,
}: { title: string; resourceType?: 'packaged' | 'organic'; remaining: string | number; total: string | number; allocated: string | number; fulfilled: string | number; unit: string; budgetHint?: string; deadline?: string; intendedUse?: string; area?: string; status?: string; category?: string; showCounters?: boolean; to?: string }) {
  const organic = resourceType === 'organic'
  return (
    <article className="request-card min-w-0 rounded-md border border-border bg-surface wrap-anywhere [&_h2]:m-0 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-semibold flex flex-col items-start gap-4 p-5 shadow-card [&_p]:m-0">
      <p className="text-sm font-semibold text-primary-hover">DIBUTUHKAN</p>
      <span
        className="inline-flex min-w-32 items-center gap-1 self-start rounded-md bg-warning-container px-2 py-1 text-xs leading-4 text-on-warning-container"
      >
        {!organic && <Icon name="packaged" />}
        {organic ? 'Bahan organik' : 'Makanan kemasan'}
      </span>
      <h2>{to ? <Link to={to}>{title}</Link> : title}</h2>
      {category && <p className="sr-only">Kategori: {category}</p>}
      <div className="font-semibold leading-[1.556]">
        <p>
          Sisa kebutuhan {remaining} {unit}
        </p>
        <p className={showCounters ? 'mt-1 text-sm font-normal text-muted' : 'sr-only'}>
          Total {total} · Alokasi {allocated} · Terpenuhi {fulfilled}
        </p>
      </div>
      {budgetHint && <p className="m-0 text-sm leading-5 text-muted whitespace-pre-line">{budgetHint}</p>}
      {deadline && (
        <p className="flex items-start gap-2 text-sm leading-5">
          <Icon name="clock" />
          Terima penawaran sampai {deadline}
        </p>
      )}
      {intendedUse && <p className="m-0 text-sm leading-[1.5] text-muted">Pemanfaatan: {intendedUse}</p>}
      {area && <p className="m-0 text-sm leading-5 text-muted">{area}</p>}
      <p className="m-0 text-sm leading-5 text-notice">{status}</p>
    </article>
  )
}
