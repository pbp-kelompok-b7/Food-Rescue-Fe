import type * as React from 'react'
import Dialog from '../ui/Dialog.tsx'
import Button from '../ui/Button.tsx'

export default function FilterSheet({
  open,
  onClose,
  onApply,
  children,
  title = 'Filter resource',
}: { open: boolean; onClose: () => void; onApply?: () => void; children: React.ReactNode; title?: string }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className="fr-filter-sheet"
    >
      {children}
      <div className="fr-dialog-actions">
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
        {onApply && <Button onClick={onApply}>Terapkan filter</Button>}
      </div>
    </Dialog>
  )
}
