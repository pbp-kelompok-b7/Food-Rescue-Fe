import { Route, Routes } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'
import ModulePage from './pages/ModulePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import { pages } from './routes.js'
import { lazy, Suspense } from 'react'

const ComponentCatalogPage = import.meta.env.DEV
  ? lazy(() => import('./pages/ComponentCatalogPage.jsx'))
  : null

const renderPage = (page) => <Route key={page.key} path={page.path} element={<ModulePage title={page.title} />} />

export default function App() {
  return <Routes>
    <Route element={<AppLayout />}>
      {ComponentCatalogPage && <Route path="components" element={<Suspense fallback={<p role="status">Memuat katalog…</p>}><ComponentCatalogPage /></Suspense>} />}
      {pages.filter((page) => page.access === 'public').map(renderPage)}
      <Route element={<RequireAuth />}>
        {pages.filter((page) => page.access === 'authenticated').map(renderPage)}
      </Route>
      <Route element={<RequireAuth admin />}>
        {pages.filter((page) => page.access === 'admin').map(renderPage)}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
