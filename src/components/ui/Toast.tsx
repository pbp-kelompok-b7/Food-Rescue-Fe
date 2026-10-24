import type * as React from 'react'
import { useEffect } from 'react'
import Button from './Button.tsx'
import Icon from './Icon.tsx'

export default function Toast({
  children,
  tone = 'success',
  onDismiss,
  duration = 0,
}: { children: React.ReactNode; tone?: 'info' | 'warning' | 'danger' | 'success'; onDismiss?: () => void; duration?: number }) {
  useEffect(() => {
    if (!duration || !onDismiss) return
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [duration, onDismiss])
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 text-sm leading-5 font-semibold [&>div]:min-w-0 [&>div]:flex-1" role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={tone === 'success' ? 'confirmation' : tone} />
      <div>{children}</div>
      {onDismiss && (
        <Button
          variant="ghost"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
        >
          Tutup
        </Button>
      )}
    </div>
  )
}
