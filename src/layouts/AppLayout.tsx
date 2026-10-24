import { Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import Navbar from '../components/navigation/Navbar.tsx'
import Footer from '../components/navigation/Footer.tsx'

export default function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16')?.focus()
  }, [pathname])

  return (
    <>
      <a className="fixed -top-25 left-4 z-10 bg-surface p-3 focus:top-3" href="#flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16">Langsung ke konten</a>
      <Navbar />
      <main id="flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16" className="mx-auto w-[calc(100%_-_2rem)] max-w-280 sm:w-[calc(100%_-_3rem)] flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16" tabIndex={-1}><Outlet /></main>
      <Footer />
    </>
  )
}
