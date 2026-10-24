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
      className="mt-auto mr-0 mb-0 ml-0 max-h-[90svh] w-full max-w-none rounded-b-none nav:m-auto nav:max-h-[calc(100svh_-_32px)] nav:w-[min(440px,calc(100%_-_32px))] nav:rounded-b-xl"
    >
      {children}
      <div className="mt-4 flex gap-3 [&>button]:flex-1">
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
        {onApply && <Button onClick={onApply}>Terapkan filter</Button>}
      </div>
    </Dialog>
  )
}
