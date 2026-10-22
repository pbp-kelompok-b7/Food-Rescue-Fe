import Icon from './Icon.jsx'

export default function EmptyState({
  title = 'Belum ada resource',
  children,
  action,
  variant = 'default',
}) {
  return (
    <section className="fr-empty">
      <Icon name={variant === 'dashboard' ? 'dashboard' : 'empty'} />
      <h2>{title}</h2>
      {children && <div>{children}</div>}
      {action}
    </section>
  )
}
