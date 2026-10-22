import { Link } from 'react-router'

const defaultGroups = [
  {
    title: 'Jelajahi',
    links: [
      { to: '/supply', label: 'Cari resource' },
      { to: '/requests', label: 'Papan request' },
    ],
  },
  {
    title: 'Akun',
    links: [
      { to: '/login', label: 'Masuk' },
      { to: '/register', label: 'Daftar' },
    ],
  },
]

export default function Footer({ groups = defaultGroups, attribution }) {
  return (
    <footer className="fr-footer">
      <div className="fr-footer-top">
        <div className="fr-footer-brand">
          <Link className="fr-brand" to="/">
            food rescue
          </Link>
          <p>
            Mempertemukan pemilik pangan berlebih dengan yang bisa
            memanfaatkannya. Untuk makanan siap konsumsi dan bahan organik.
          </p>
        </div>
        <div className="fr-footer-groups">
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <div className="fr-footer-notice">
        <strong>Periksa kondisi sebelum reservasi.</strong>
        <p>
          Kondisi dan kesesuaian dijelaskan pemilik, bukan diverifikasi
          otomatis. Kontak dibuka bagi pasangan transaksi setelah ACCEPTED.
          Pembayaran dan negosiasi berlangsung di luar platform.
        </p>
      </div>
      <div className="fr-footer-bottom">
        <span>© {new Date().getFullYear()} Food Rescue</span>
        {attribution && <span>{attribution}</span>}
      </div>
    </footer>
  )
}
