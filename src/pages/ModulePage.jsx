import { useEffect } from 'react'
import PageState from '../components/PageState.jsx'

export default function ModulePage({ title }) {
  useEffect(() => { document.title = `${title} | Food Rescue` }, [title])
  return <>
    <div className="page-heading"><h1>{title}</h1></div>
    <PageState title="Fitur sedang disiapkan">Halaman ini belum tersedia.</PageState>
  </>
}
