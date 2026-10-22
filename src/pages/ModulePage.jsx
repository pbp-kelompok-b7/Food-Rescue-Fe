import { useEffect } from 'react'
import PageState from '../components/PageState.jsx'

const modules = {
  supply: {
    title: 'Supply pangan',
    description: 'Temukan surplus makanan dan bahan organik yang masih dapat dimanfaatkan.',
    state: 'Supply belum tersedia',
    message: 'Fitur penelusuran supply sedang disiapkan. Listing belum dapat ditampilkan.',
  },
  requests: {
    title: 'Request Board',
    description: 'Temukan kebutuhan pangan dan bahan organik dari komunitas.',
    state: 'Request belum tersedia',
    message: 'Fitur penelusuran request sedang disiapkan. Permintaan belum dapat ditampilkan.',
  },
  login: {
    title: 'Masuk',
    description: 'Kelola supply, request, reservation, dan pickup dalam satu akun.',
    state: 'Fitur masuk sedang disiapkan',
    message: 'Login belum tersedia. Kamu tetap dapat membuka halaman Supply dan Request Board.',
  },
  register: {
    title: 'Daftar akun',
    description: 'Satu akun untuk berbagi resource dan mengajukan kebutuhan.',
    state: 'Pendaftaran sedang disiapkan',
    message: 'Pembuatan akun belum tersedia. Silakan kembali setelah fitur pendaftaran dibuka.',
  },
}

export default function ModulePage({ module }) {
  const page = modules[module]
  useEffect(() => { document.title = `${page.title} | Food Rescue` }, [page.title])
  return (
    <>
      <div className="page-heading"><h1>{page.title}</h1><p>{page.description}</p></div>
      <PageState title={page.state}>{page.message}</PageState>
    </>
  )
}
