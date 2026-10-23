import { Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import Navbar from '../components/navigation/Navbar.tsx'
import Footer from '../components/navigation/Footer.tsx'

export default function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('main-content')?.focus()
  }, [pathname])

  return (
    <>
      <a className="skip-link" href="#main-content">Langsung ke konten</a>
      <Navbar />
      <main id="main-content" className="container main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
    </>
  )
}
