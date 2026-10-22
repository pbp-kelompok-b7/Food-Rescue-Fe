import { Link } from 'react-router'
import Icon from '../ui/Icon.jsx'

export default function SupplyCard({
  title,
  resourceType = 'packaged',
  mode = 'DONATE',
  quantity,
  unit,
  deadline,
  area,
  intendedUse,
  condition,
  photoUrl,
  photoAlt = '',
  to,
  action,
}) {
  const organic = resourceType === 'organic'
  const sell = mode === 'SELL'
  return (
    <article
      className={`fr-supply-card ${organic ? 'fr-supply-card--organic' : ''}`}
    >
      <div className="fr-resource-band">
        <Icon name={organic ? 'organicLarge' : 'packageLarge'} />
        <span>{organic ? 'Bahan organik' : 'Siap konsumsi'}</span>
      </div>
      {photoUrl && (
        <img
          className="fr-resource-photo"
          src={photoUrl}
          alt={photoAlt}
          loading="lazy"
        />
      )}
      <div className="fr-supply-body">
        <div
          className={`fr-resource-mode ${sell ? 'fr-resource-mode--sell' : ''}`}
        >
          <Icon name={sell ? 'sell' : 'donate'} />
          {sell ? 'SELL' : 'Donasi'}
        </div>
        <h2>{title}</h2>
        <p className="fr-resource-quantity">
          {quantity} {unit} tersedia
        </p>
        <div className="fr-resource-meta">
          {deadline && (
            <p>
              <Icon name="clock" />
              <span>
                {organic ? 'Batas tersedia' : 'Batas konsumsi'}: {deadline}
              </span>
            </p>
          )}
          {area && (
            <p>
              <Icon name="pin" />
              <span>{area}</span>
            </p>
          )}
        </div>
        {intendedUse && (
          <span className="fr-resource-use">
            <Icon name={organic ? 'compost' : 'food'} />
            {intendedUse}
          </span>
        )}
        {condition && <p className="fr-hint">{condition}</p>}
        {to && (
          <Link to={to} className="fr-button fr-button--secondary">
            Lihat detail →<span className="sr-only"> {title}</span>
          </Link>
        )}
        {action}
      </div>
    </article>
  )
}
