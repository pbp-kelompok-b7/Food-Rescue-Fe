import Badge from '../ui/Badge.jsx'

export default function PickupStatus({
  status,
  label,
  tone,
  scheduledAt,
  location,
  instructions,
  children,
  actions,
}) {
  return (
    <section className="fr-pickup-status">
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
      {actions && <div className="fr-card-actions">{actions}</div>}
    </section>
  )
}
