import { Navigate, Route, Routes } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'
import ModulePage from './pages/ModulePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/supply" replace />} />
        <Route path="supply" element={<ModulePage module="supply" />} />
        <Route path="requests" element={<ModulePage module="requests" />} />
        <Route path="login" element={<ModulePage module="login" />} />
        <Route path="register" element={<ModulePage module="register" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
