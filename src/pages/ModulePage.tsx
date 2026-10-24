import { useEffect } from 'react'
import PageState from '../components/PageState.tsx'

export default function ModulePage({ title }: { title: string }) {
  useEffect(() => { document.title = `${title} | Food Rescue` }, [title])
  return <>
    <div className="mb-8 [&_p]:mb-0 [&_p]:max-w-[64ch] [&_p]:text-muted"><h1>{title}</h1></div>
    <PageState title="Fitur sedang disiapkan">Halaman ini belum tersedia.</PageState>
  </>
}
