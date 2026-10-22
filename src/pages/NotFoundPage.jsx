import { Link } from 'react-router'
import { useEffect } from 'react'
import PageState from '../components/PageState.jsx'

export default function NotFoundPage() {
  useEffect(() => { document.title = 'Halaman tidak ditemukan | Food Rescue' }, [])
  return (
    <PageState title="Halaman tidak ditemukan" action={<Link className="button" to="/supply">Kembali ke Supply</Link>}>
      Alamat yang kamu buka tidak tersedia.
    </PageState>
  )
}
