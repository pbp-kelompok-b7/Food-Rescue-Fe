import type { ReactNode } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import AuthProvider from './auth/AuthProvider.tsx'
import RouteError from './components/RouteError.tsx'
import './index.css'

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
  return <main className="mx-auto w-[calc(100%_-_2rem)] max-w-280 sm:w-[calc(100%_-_3rem)] flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16"><p role="status">Memuat Food Rescue...</p></main>
}

export function ErrorBoundary() {
  return (
    <main className="mx-auto w-[calc(100%_-_2rem)] max-w-280 sm:w-[calc(100%_-_3rem)] flex-1 pt-7 pb-12 focus:outline-none sm:pt-10 sm:pb-16">
      <RouteError />
    </main>
  )
}
