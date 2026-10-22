import Icon from './Icon.jsx'

export default function Alert({
  title,
  children,
  tone = 'info',
  className = '',
  ...props
}) {
  return (
    <div
      {...props}
      className={`fr-alert fr-alert--${tone} ${className}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={tone} />
      <div>
        {title && <p className="fr-alert-title">{title}</p>}
        {children && <div className="fr-alert-copy">{children}</div>}
      </div>
    </div>
  )
}
