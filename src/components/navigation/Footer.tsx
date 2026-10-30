import { Link } from 'react-router'
import TransactionFooter from '../transactions/TransactionFooter.tsx'

const defaultGroups = [
  {
    title: 'Jelajahi',
    links: [
      { to: '/supply', label: 'Cari resource' },
      { to: '/requests', label: 'Papan request' },
    ],
  },
  {
    title: 'Berbagi & akun',
    links: [
      { to: '/supply/new', label: 'Tawarkan resource' },
      { to: '/requests/new', label: 'Buat request' },
      { to: '/login', label: 'Masuk' },
      { to: '/register', label: 'Daftar' },
    ],
  },
]

export default function Footer({
  groups = defaultGroups,
  attribution = 'Data lokasi: © OpenStreetMap contributors',
  landing = false,
  compact = false,
}: {
  groups?: { title: string; links: { to: string; label: string }[] }[]
  attribution?: string
  landing?: boolean
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="bg-canvas px-6 nav:px-12">
        <div className="mx-auto w-full max-w-320">
          <TransactionFooter />
        </div>
      </div>
    )
  }
  return (
    <footer
      className={`border-t border-border bg-surface text-sm leading-normal [&_p]:m-0 [&_p]:text-muted ${
        landing ? 'px-5 py-8 lg:px-6' : 'px-5 py-6 nav:p-8'
      }`}
    >
      <div className={`flex flex-col gap-6 ${landing ? 'mx-auto max-w-300' : ''}`}>
        <div className="flex flex-col gap-6 nav:flex-row nav:gap-8">
          <div className="nav:basis-64 nav:shrink-0">
            <Link className="mb-3 inline-block font-brand text-xl leading-6 font-semibold text-primary no-underline hover:no-underline" to="/">
              food rescue
            </Link>
            <p>
              Mempertemukan pemilik pangan berlebih dengan yang bisa
              memanfaatkannya. Untuk makanan siap konsumsi dan bahan organik.
            </p>
          </div>
          <div className="flex flex-1 gap-4 nav:gap-6">
            {groups.map((group) => (
              <nav key={group.title} className="flex flex-1 flex-col items-stretch gap-1" aria-label={group.title}>
                <h2 className="m-0 text-sm leading-normal">{group.title}</h2>
                {group.links.map((link) => (
                  <Link key={link.to} className="inline-flex min-h-11 items-center font-normal no-underline" to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <strong className="mb-1.5 block">Periksa kondisi sebelum reservasi.</strong>
          <p>
            Kondisi dan kesesuaian dijelaskan pemilik, bukan diverifikasi
            otomatis. Kontak dibuka bagi pasangan transaksi setelah ACCEPTED.
            Pembayaran dan negosiasi berlangsung di luar platform.
          </p>
        </div>
        <div className="flex flex-col justify-between gap-2 text-xs leading-normal text-muted nav:flex-row nav:gap-6">
          <span>© {new Date().getFullYear()} Food Rescue</span>
          {attribution && <span>{attribution}</span>}
        </div>
      </div>
    </footer>
  )
}
