import { useEffect, useId, useRef } from 'react'

// Native modal provides focus trapping, Escape handling and an inert background.
export default function Dialog({
  open,
  onClose,
  title,
  children,
  className = '',
  initialFocusRef,
}) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!open) return
    const previousFocus = document.activeElement
    if (!dialog.open) dialog.showModal()
    initialFocusRef?.current?.focus()
    return () => {
      dialog.close()
      previousFocus?.focus()
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
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  )
}
