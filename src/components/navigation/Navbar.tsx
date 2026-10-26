import { useId, useState } from 'react'
import { Link, NavLink } from 'react-router'
import Button from '../ui/Button.tsx'
import Icon from '../ui/Icon.tsx'

const navLinkClass = 'inline-flex min-h-11 items-center text-sm font-semibold text-ink no-underline hover:no-underline aria-[current=page]:text-primary-hover aria-[current=page]:underline aria-[current=page]:decoration-2'

const defaultLinks = [
  { to: '/supply', label: 'Cari resource' },
  { to: '/requests', label: 'Papan request' },
]

export default function Navbar({
  user = null,
  links = defaultLinks,
  accountLinks = [],
  onLogout,
  sessionStatus = 'anonymous',
  onRetrySession,
  loggingOut = false,
  authPage = false,
}: { user?: { name?: string } | null; links?: { to: string; label: string }[]; accountLinks?: { to: string; label: string }[]; onLogout?: () => void; sessionStatus?: 'loading' | 'authenticated' | 'anonymous' | 'error'; onRetrySession?: () => void; loggingOut?: boolean; authPage?: boolean }) {
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
      className="border-b border-border bg-surface"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          const disclosure = event.currentTarget
            .querySelector<HTMLButtonElement>('[aria-expanded="true"]')
          close()
          disclosure?.focus()
        }
      }}
    >
      <div className={`flex min-h-17 items-center gap-4 px-5 py-3 nav:px-6 nav:py-4 ${authPage ? 'nav:min-h-21' : 'nav:min-h-19'}`}>
        <Link className="flex-1 font-sans text-lg font-bold text-primary no-underline hover:no-underline nav:flex-none nav:font-brand nav:font-semibold" to="/" onClick={close}>
          food rescue
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-5 nav:flex" aria-label="Navigasi utama">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass} onClick={close}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          {user ? (
            <div className="relative">
              <Button
                className="border-0 bg-transparent p-0 text-on-primary-container shadow-none hover:not-disabled:bg-primary-container active:not-disabled:bg-primary-container active:not-disabled:opacity-100 nav:bg-primary-container nav:px-3 nav:py-2.5"
                aria-label={user.name || 'Akun saya'}
                aria-expanded={accountOpen}
                aria-controls={accountId}
                onClick={() => {
                  setAccountOpen(!accountOpen)
                  setMenuOpen(false)
                }}
              >
                <Icon name="profile" className="max-nav:hidden" />
                <Icon name="account" className="nav:hidden" />
                <span className="hidden max-w-36 truncate nav:inline">
                  {user.name || 'Akun saya'}
                </span>
                <Icon name="accountChevron" className="max-nav:hidden" />
              </Button>
              <div
                id={accountId}
                className="absolute top-[calc(100%_+_8px)] right-0 z-5 min-w-45 rounded-md border border-border bg-surface p-3 shadow-card"
                hidden={!accountOpen}
              >
                <nav className="flex flex-col items-stretch" aria-label="Akun">
                  {accountLinks.map((link) => (
                    <Link key={link.to} to={link.to} className={navLinkClass} onClick={close}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
                {onLogout && (
                  <Button
                    variant="ghost"
                    loading={loggingOut}
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
          ) : sessionStatus === 'anonymous' ? (
            <div className="hidden items-center gap-2 nav:flex">
              <Link className="inline-flex min-h-11 min-w-17 items-center justify-center px-3 py-2.5 text-sm leading-5 font-semibold no-underline" to="/login">
                Masuk
              </Link>
              <Link className="fr-button min-w-19 bg-brand text-on-brand hover:not-disabled:bg-brand-hover active:not-disabled:bg-brand-active active:not-disabled:opacity-100" to="/register">
                Daftar
              </Link>
            </div>
          ) : sessionStatus === 'loading' ? <span className="text-sm text-muted" role="status">Memeriksa sesi...</span> : <Button variant="ghost" onClick={onRetrySession}>Periksa sesi lagi</Button>}
          <Button
            className="px-2.5 py-2.5 nav:hidden"
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
        className="flex flex-col items-stretch px-5 pb-4 nav:hidden [&_a]:px-3 [&_a]:py-2.5"
        aria-label="Navigasi mobile"
        hidden={!menuOpen}
      >
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={navLinkClass} onClick={close}>
            {link.label}
          </NavLink>
        ))}
        {!user && sessionStatus === 'anonymous' && (
          <>
            <Link to="/login" className={navLinkClass} onClick={close}>
              Masuk
            </Link>
            <Link to="/register" className={navLinkClass} onClick={close}>
              Daftar
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
