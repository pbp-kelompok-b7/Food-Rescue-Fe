import Dialog from '../ui/Dialog.jsx'
import Button from '../ui/Button.jsx'

export default function FilterSheet({
  open,
  onClose,
  onApply,
  children,
  title = 'Filter resource',
}) {
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
