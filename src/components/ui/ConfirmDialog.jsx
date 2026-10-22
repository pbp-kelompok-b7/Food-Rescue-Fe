import { useRef } from 'react'
import Button from './Button.jsx'
import Dialog from './Dialog.jsx'

export default function ConfirmDialog({
  open,
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  destructive = false,
  loading = false,
}) {
  const cancelRef = useRef(null)
  return (
    <Dialog
      open={open}
      title={title}
      onClose={loading ? undefined : onCancel}
      initialFocusRef={cancelRef}
    >
      <div className="fr-dialog-description">{children}</div>
      <div className="fr-dialog-actions">
        <Button
          ref={cancelRef}
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
