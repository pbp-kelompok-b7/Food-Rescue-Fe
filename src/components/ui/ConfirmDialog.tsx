import type * as React from 'react'
import { useRef } from 'react'
import Button from './Button.tsx'
import Dialog from './Dialog.tsx'

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
}: { open: boolean; title: string; children: React.ReactNode; onCancel: () => void; onConfirm: () => void; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; loading?: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      title={title}
      onClose={loading ? undefined : onCancel}
      initialFocusRef={cancelRef}
    >
      <div className="text-muted">{children}</div>
      <div className="mt-4 flex gap-3 [&>button]:h-11 [&>button]:flex-1 [&>button]:py-0">
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
