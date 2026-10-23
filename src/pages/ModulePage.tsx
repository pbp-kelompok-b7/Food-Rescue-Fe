import { useEffect } from 'react'
import PageState from '../components/PageState.tsx'

export default function ModulePage({ title }: { title: string }) {
  useEffect(() => { document.title = `${title} | Food Rescue` }, [title])
  return <>
    <div className="page-heading"><h1>{title}</h1></div>
    <PageState title="Fitur sedang disiapkan">Halaman ini belum tersedia.</PageState>
  </>
}
