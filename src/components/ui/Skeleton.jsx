export default function Skeleton({
  label = 'Memuat resource…',
  className = '',
}) {
  return (
    <div className={`fr-skeleton ${className}`} role="status" aria-busy="true">
      <p className="fr-hint">{label}</p>
      <div aria-hidden="true" className="fr-skeleton-lines">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
