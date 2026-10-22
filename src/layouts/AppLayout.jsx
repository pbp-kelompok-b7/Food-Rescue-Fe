import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'

export default function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('main-content')?.focus()
  }, [pathname])

  return (
    <>
      <a className="skip-link" href="#main-content">Langsung ke konten</a>
      <header className="site-header">
        <div className="container header-content">
          <Link className="brand" to="/">Food Rescue<span>Berbagi pangan, mengurangi sisa.</span></Link>
          <nav className="main-nav" aria-label="Navigasi utama">
            <NavLink to="/supply">Supply</NavLink>
            <NavLink to="/requests">Request Board</NavLink>
          </nav>
          <nav className="account-nav" aria-label="Akun">
            <NavLink to="/login">Masuk</NavLink>
            <NavLink to="/register" className="button">Daftar</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content" className="container main-content" tabIndex={-1}><Outlet /></main>
      <footer className="container site-footer">Food Rescue · PBP Kelompok B7</footer>
    </>
  )
}
