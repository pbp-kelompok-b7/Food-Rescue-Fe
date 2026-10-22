import { useEffect } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'

export default function Toast({
  children,
  tone = 'success',
  onDismiss,
  duration = 0,
}) {
  useEffect(() => {
    if (!duration || !onDismiss) return
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [duration, onDismiss])
  return (
    <div className="fr-toast" role={tone === 'danger' ? 'alert' : 'status'}>
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
