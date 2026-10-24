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
  to,
}: { title: string; resourceType?: 'packaged' | 'organic'; remaining: number; total: number; allocated: number; fulfilled: number; unit: string; budgetHint?: string; deadline?: string; intendedUse?: string; area?: string; status?: string; to?: string }) {
  const organic = resourceType === 'organic'
  return (
    <article className="min-w-0 rounded-md border border-border bg-surface wrap-anywhere [&_h2]:m-0 [&_h2]:text-xl [&_h2]:leading-7 [&_h2]:font-semibold flex flex-col items-start gap-4 p-5 shadow-card [&_p]:m-0">
      <p className="text-sm font-semibold text-primary-hover">DIBUTUHKAN</p>
      <span
        className={`inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-xs leading-4 font-semibold ${organic ? 'bg-organic-container text-on-organic' : 'bg-warning-container text-on-warning-container'}`}
      >
        <Icon name={organic ? 'organic' : 'packaged'} />
        {organic ? 'Bahan organik' : 'Pangan kemasan'}
      </span>
      <h2>{to ? <Link to={to}>{title}</Link> : title}</h2>
      <div className="font-semibold leading-[1.556]">
        <p>
          Sisa kebutuhan {remaining} {unit}
        </p>
        <p>
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
