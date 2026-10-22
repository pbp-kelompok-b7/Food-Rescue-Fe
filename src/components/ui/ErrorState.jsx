import Button from './Button.jsx'
import Icon from './Icon.jsx'

export default function ErrorState({
  title = 'Gagal memuat data',
  children = 'Periksa koneksi dan coba lagi.',
  onRetry,
  loading = false,
}) {
  return (
    <section className="fr-error" role="alert">
      <Icon name="error" />
      <h2>{title}</h2>
      <div>{children}</div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} loading={loading}>
          Coba lagi
        </Button>
      )}
    </section>
  )
}
