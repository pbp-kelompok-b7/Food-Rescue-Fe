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
    <article className="fr-request-card">
      <p className="fr-request-heading">DIBUTUHKAN</p>
      <span
        className={`fr-resource-type ${organic ? 'fr-resource-type--organic' : ''}`}
      >
        <Icon name={organic ? 'organic' : 'packaged'} />
        {organic ? 'Bahan organik' : 'Pangan kemasan'}
      </span>
      <h2>{to ? <Link to={to}>{title}</Link> : title}</h2>
      <div>
        <p>
          Sisa kebutuhan {remaining} {unit}
        </p>
        <p>
          Total {total} · Alokasi {allocated} · Terpenuhi {fulfilled}
        </p>
      </div>
      {budgetHint && <p className="fr-hint fr-preserve-lines">{budgetHint}</p>}
      {deadline && (
        <p className="fr-meta-row">
          <Icon name="clock" />
          Terima penawaran sampai {deadline}
        </p>
      )}
      {intendedUse && <p className="fr-hint">Pemanfaatan: {intendedUse}</p>}
      {area && <p className="fr-hint">{area}</p>}
      <p className="fr-hint">{status}</p>
    </article>
  )
}
