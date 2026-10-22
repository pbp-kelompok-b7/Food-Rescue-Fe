import Icon from './Icon.jsx'

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`fr-button fr-button--${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Icon name="loading" className="fr-spinner" />}
      {children}
    </button>
  )
}
