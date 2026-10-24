import type * as React from 'react'
import { useEffect, useId, useRef } from 'react'

// Native modal provides focus trapping, Escape handling and an inert background.
export default function Dialog({
  open,
  onClose,
  title,
  children,
  className = '',
  initialFocusRef,
}: { open: boolean; onClose?: () => void; title: string; children: React.ReactNode; className?: string; initialFocusRef?: React.RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const previousFocus = document.activeElement
    if (!dialog.open) dialog.showModal()
    initialFocusRef?.current?.focus()
    return () => {
      dialog.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open, initialFocusRef])
  return (
    <dialog
      ref={ref}
      className={`fr-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
    >
      <h2 id={titleId} className="mb-4 leading-normal">{title}</h2>
      {children}
    </dialog>
  )
}
