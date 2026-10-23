import { useId, useState } from 'react'
import { Link, NavLink } from 'react-router'
import Button from '../ui/Button.tsx'
import Icon from '../ui/Icon.tsx'

const defaultLinks = [
  { to: '/supply', label: 'Cari resource' },
  { to: '/requests', label: 'Papan request' },
]

export default function Navbar({
  user = null,
  links = defaultLinks,
  accountLinks = [],
  onLogout,
}: { user?: { name?: string } | null; links?: { to: string; label: string }[]; accountLinks?: { to: string; label: string }[]; onLogout?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const menuId = useId()
  const accountId = useId()
  const close = () => {
    setMenuOpen(false)
    setAccountOpen(false)
  }
  return (
    <header
      className="fr-navbar"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          const disclosure = (event.target as HTMLElement)
            .closest('.fr-navbar')
            ?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')
          close()
          disclosure?.focus()
        }
      }}
    >
      <div className="fr-navbar-row">
        <Link className="fr-brand" to="/" onClick={close}>
          food rescue
        </Link>
        <nav className="fr-navbar-desktop" aria-label="Navigasi utama">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={close}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="fr-navbar-account">
          {user ? (
            <div className="fr-account-disclosure">
              <Button
                variant="secondary"
                aria-label={user.name || 'Akun saya'}
                aria-expanded={accountOpen}
                aria-controls={accountId}
                onClick={() => {
                  setAccountOpen(!accountOpen)
                  setMenuOpen(false)
                }}
              >
                <Icon name="profile" className="fr-account-desktop-icon" />
                <Icon name="account" className="fr-account-mobile-icon" />
                <span className="fr-account-label">
                  {user.name || 'Akun saya'}
                </span>
                <Icon name="accountChevron" className="fr-account-desktop-icon" />
              </Button>
              <div
                id={accountId}
                className="fr-account-panel"
                hidden={!accountOpen}
              >
                <nav aria-label="Akun">
                  {accountLinks.map((link) => (
                    <Link key={link.to} to={link.to} onClick={close}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
                {onLogout && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      close()
                      onLogout()
                    }}
                  >
                    Keluar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="fr-navbar-auth">
              <Link className="fr-link-button" to="/login">
                Masuk
              </Link>
              <Link className="fr-button fr-button--brand" to="/register">
                Daftar
              </Link>
            </div>
          )}
          <Button
            className="fr-navbar-toggle"
            variant="ghost"
            aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => {
              setMenuOpen(!menuOpen)
              setAccountOpen(false)
            }}
          >
            <Icon name="menu" />
          </Button>
        </div>
      </div>
      <nav
        id={menuId}
        className="fr-navbar-mobile"
        aria-label="Navigasi mobile"
        hidden={!menuOpen}
      >
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} onClick={close}>
            {link.label}
          </NavLink>
        ))}
        {!user && (
          <>
            <Link to="/login" onClick={close}>
              Masuk
            </Link>
            <Link to="/register" onClick={close}>
              Daftar
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
