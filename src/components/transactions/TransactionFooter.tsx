export default function TransactionFooter() {
  return (
    <footer className="py-6 text-sm text-muted [&_p]:mb-2 [&_small]:text-xs">
      <p>Pembayaran dan koordinasi dilakukan langsung antara peserta.</p>
      <small>© {new Date().getFullYear()} Food Rescue</small>
    </footer>
  )
}
