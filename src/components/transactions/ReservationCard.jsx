import { Link } from 'react-router'
import Badge from '../ui/Badge.jsx'

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
}) {
  return (
    <article className="fr-reservation-card">
      <div className="fr-reservation-heading">
        {reference && <span className="fr-hint">{reference}</span>}
        <Badge status={status} />
      </div>
      <h2>{to ? <Link to={to}>{title}</Link> : title}</h2>
      <p>
        {quantity} {unit}
      </p>
      {counterpart && <p className="fr-hint">{counterpart}</p>}
      {pickupTime && <p className="fr-hint">Pickup: {pickupTime}</p>}
      {actions && <div className="fr-card-actions">{actions}</div>}
    </article>
  )
}
