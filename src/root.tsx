import type { ReactNode } from 'react'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from 'react-router'
import AuthProvider from './auth/AuthProvider.tsx'
import './index.css'
import './styles/components.css'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Food Rescue mempertemukan pemilik surplus pangan dengan pihak yang dapat memanfaatkannya." />
        <Meta />
        <Links />
      </head>
      <body>
        <div id="root">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <AuthProvider><Outlet /></AuthProvider>
}

export function HydrateFallback() {
  return <main className="container main-content"><p role="status">Memuat Food Rescue...</p></main>
}

export function ErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) && error.status === 404
    ? 'Halaman tidak ditemukan.'
    : 'Halaman gagal dimuat. Silakan coba lagi.'
  return (
    <main className="container main-content">
      <h1>{message}</h1>
      <a className="fr-button" href="/">Kembali ke beranda</a>
    </main>
  )
}
