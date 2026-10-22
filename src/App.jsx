import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'
import ModulePage from './pages/ModulePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RequireAuth from './auth/RequireAuth.jsx'

const ComponentCatalogPage = import.meta.env.DEV
  ? lazy(() => import('./pages/ComponentCatalogPage.jsx'))
  : null

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {ComponentCatalogPage && (
          <Route path="components" element={
            <Suspense fallback={<p role="status">Memuat katalog...</p>}>
              <ComponentCatalogPage />
            </Suspense>
          } />
        )}
        <Route path="/" element={<ModulePage title="Food Rescue" />} />
        <Route path="/login" element={<ModulePage title="Masuk" />} />
        <Route path="/register" element={<ModulePage title="Daftar akun" />} />
        <Route path="/supply" element={<ModulePage title="Supply pangan" />} />
        <Route path="/supply/:id" element={<ModulePage title="Detail supply" />} />
        <Route path="/requests" element={<ModulePage title="Request Board" />} />
        <Route path="/requests/:id" element={<ModulePage title="Detail request" />} />
        <Route element={<RequireAuth />}>
          <Route path="/profile" element={<ModulePage title="Profil" />} />
          <Route path="/supply/new" element={<ModulePage title="Buat supply" />} />
          <Route path="/supply/:id/edit" element={<ModulePage title="Edit supply" />} />
          <Route path="/my/supply" element={<ModulePage title="Supply saya" />} />
          <Route path="/supply/:id/claim" element={<ModulePage title="Ajukan claim" />} />
          <Route path="/requests/new" element={<ModulePage title="Buat request" />} />
          <Route path="/requests/:id/edit" element={<ModulePage title="Edit request" />} />
          <Route path="/my/requests" element={<ModulePage title="Request saya" />} />
          <Route path="/requests/:id/offer" element={<ModulePage title="Tawarkan resource" />} />
          <Route path="/reservations" element={<ModulePage title="Reservation" />} />
          <Route path="/reservations/:id" element={<ModulePage title="Detail reservation" />} />
          <Route path="/reservations/:id/edit" element={<ModulePage title="Revisi quantity" />} />
          <Route path="/reservations/:id/pickup" element={<ModulePage title="Jadwalkan pickup" />} />
          <Route path="/pickups" element={<ModulePage title="Pickup" />} />
          <Route path="/pickups/:id" element={<ModulePage title="Detail pickup" />} />
          <Route path="/pickups/:id/edit" element={<ModulePage title="Instruksi pickup" />} />
        </Route>
        <Route element={<RequireAuth admin />}>
          <Route path="/admin" element={<ModulePage title="Moderasi" />} />
          <Route path="/admin/users" element={<ModulePage title="Moderasi users" />} />
          <Route path="/admin/listings" element={<ModulePage title="Moderasi listings" />} />
          <Route path="/admin/requests" element={<ModulePage title="Moderasi requests" />} />
          <Route path="/admin/reservations" element={<ModulePage title="Moderasi reservations" />} />
          <Route path="/admin/pickups" element={<ModulePage title="Moderasi pickups" />} />
          <Route path="/admin/users/:id" element={<ModulePage title="Detail moderasi users" />} />
          <Route path="/admin/listings/:id" element={<ModulePage title="Detail moderasi listings" />} />
          <Route path="/admin/requests/:id" element={<ModulePage title="Detail moderasi requests" />} />
          <Route path="/admin/reservations/:id" element={<ModulePage title="Detail moderasi reservations" />} />
          <Route path="/admin/pickups/:id" element={<ModulePage title="Detail moderasi pickups" />} />
          <Route path="/admin/listings/new" element={<ModulePage title="Buat listings untuk user" />} />
          <Route path="/admin/requests/new" element={<ModulePage title="Buat requests untuk user" />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
