import type * as React from 'react'
import Icon from './Icon.tsx'

export default function Alert({
  title,
  children,
  tone = 'info',
  className = '',
  ...props
}: Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> & { title?: string; tone?: 'info' | 'warning' | 'danger' | 'success' }) {
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
