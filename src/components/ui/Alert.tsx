import type * as React from 'react'
import Icon from './Icon.tsx'

const toneClasses = {
  info: 'border-outline',
  warning: 'border-brand',
  danger: 'border-danger',
  success: 'border-primary',
}

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
      className={`flex items-start gap-4 rounded-md border-l-4 bg-surface p-4 text-sm leading-5 shadow-button [&>div]:min-w-0 ${toneClasses[tone]} ${className}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={tone} />
      <div>
        {title && <p className="m-0 mb-1 font-semibold">{title}</p>}
        {children && <div className="text-notice [&_p]:m-0">{children}</div>}
      </div>
    </div>
  )
}
