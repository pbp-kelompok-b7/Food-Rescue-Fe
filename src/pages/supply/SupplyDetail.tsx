import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import Alert from '../../components/ui/Alert.tsx'
import { claimable, deadlineText, priceText, quantityText, supplyError, supplyLabel } from './model.ts'
import useListing from './useListing.ts'

export default function SupplyDetail() {
  const { id = '' } = useParams()
  const result = useListing(id)
  const auth = useAuth()
  const location = useLocation()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat supply…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Supply belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/supply">Cari resource</Link></>}>{supplyError(result.error)}</PageState></div>
  const listing = result.data
  const owner = auth.status === 'authenticated' && String(auth.user?.id) === String(listing.owner.id)
  const canEdit = owner || (auth.status === 'authenticated' && auth.user?.is_admin)
  const available = claimable(listing, now)
  const expired = Date.parse(listing.available_until) <= now && listing.status === 'AVAILABLE'
  const claimTo = `/supply/${listing.id}/claim`
  const claimAction = owner ? <p className="m-0 text-sm text-muted">Ini adalah supply milikmu.</p> : !available ? <Button className="w-full" disabled>Supply tidak tersedia</Button> : auth.status === 'error' ? <Button className="w-full" variant="secondary" onClick={() => auth.refresh()}>Periksa sesi lagi</Button> : auth.status === 'loading' ? <Button className="w-full" disabled>Memeriksa sesi…</Button> : <Link className="fr-button w-full" to={auth.status === 'anonymous' ? '/login' : claimTo} state={auth.status === 'anonymous' ? { from: claimTo } : undefined}>Ajukan permintaan</Link>
  return <article className="supply-container wrap-anywhere nav:px-16 nav:pt-4">
    {location.state?.supplySaved && <Alert tone="success" title={location.state.supplySaved === 'created' ? 'Supply berhasil diterbitkan.' : 'Perubahan supply berhasil disimpan.'} />}
    <Link className="mb-6 inline-flex min-h-11 items-center text-sm" to="/supply">← Kembali</Link>
    <header className="mb-6 flex flex-col gap-3"><p className="supply-caption">SUPPLY / DETAIL</p><h1 className="supply-heading">{listing.title}</h1><div className="flex flex-wrap gap-2"><Badge tone="success">{supplyLabel(listing.mode)}</Badge><Badge status={expired ? 'EXPIRED' : listing.status}>{supplyLabel(expired ? 'EXPIRED' : listing.status)}</Badge></div></header>
    <div className="grid items-start gap-8 nav:grid-cols-[minmax(0,1.48fr)_minmax(0,1fr)] nav:gap-11">
      <div className="flex min-w-0 flex-col gap-6 nav:gap-8">
        <div className="flex min-h-65 flex-col rounded-xl bg-supply-container p-6 nav:min-h-97.5"><h2 className="m-0 font-brand text-xl font-semibold text-primary nav:text-[28px]">{listing.title}</h2><div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-surface nav:size-18"><img src="/assets/figma/supply-image.svg" className="size-8" alt="" /></span><div><p className="m-0 text-lg font-semibold">Belum ada foto</p><p className="mt-1 mb-0 text-sm text-muted">Pemilik belum menambahkan foto untuk resource ini.</p></div></div></div>
        <div><p className="mb-1 text-[22px] font-semibold">{quantityText(listing.quantity_available)} {listing.unit} tersedia</p><p className="m-0 text-sm text-muted">{listing.mode === 'SELL' ? `${priceText(listing.unit_price)} / ${listing.unit}` : 'Siap dibagikan'}</p></div>
        <div className="nav:hidden">{claimAction}</div>
        <div className="rounded-md bg-supply-container p-4 nav:hidden"><p className="m-0 text-sm">{listing.condition}</p></div>
        <section><h2 className="text-lg font-semibold">Tentang resource</h2><p className="m-0 whitespace-pre-wrap text-sm leading-6 text-muted">{listing.description}</p></section>
        <section className="flex flex-col gap-3"><h2 className="m-0 text-lg font-semibold">Kondisi & informasi</h2><p className="m-0 hidden whitespace-pre-wrap text-sm nav:block">{listing.condition}</p><dl className="m-0 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 text-sm"><dt className="text-muted">Batas pickup / konsumsi</dt><dd className="m-0">{deadlineText(listing.available_until)}</dd>{listing.storage_notes && <><dt className="text-muted">Penyimpanan</dt><dd className="m-0 whitespace-pre-wrap">{listing.storage_notes}</dd></>}{listing.packaging_status && <><dt className="text-muted">Kemasan</dt><dd className="m-0 whitespace-pre-wrap">{listing.packaging_status}</dd></>}{listing.allergen_notes && <><dt className="text-muted">Alergen</dt><dd className="m-0 whitespace-pre-wrap">{listing.allergen_notes}</dd></>}<dt className="text-muted">Pemilik</dt><dd className="m-0">{listing.owner.display_name}</dd></dl><div className="flex flex-wrap gap-2">{listing.suitability.map(value => <Badge key={value} tone="success">{supplyLabel(value)}</Badge>)}</div></section>
        <section className="nav:hidden"><h2 className="text-lg font-semibold">Lokasi pickup</h2><p className="m-0 text-sm">{listing.location.area}</p></section>
        {canEdit && <Link className="fr-button self-start" to={`/supply/${listing.id}/edit`}>Edit supply</Link>}
      </div>
      <aside className="hidden flex-col gap-5 rounded-xl bg-surface p-7 nav:flex"><h2 className="m-0 font-brand text-[22px] font-semibold">Ajukan permintaan</h2><p className="m-0 text-sm text-muted">Pastikan jadwal pickup sesuai sebelum mengajukan.</p><div className="rounded-md bg-supply-container p-4"><h3 className="mb-1 font-semibold">Informasi kondisi resource</h3><p className="m-0 whitespace-pre-wrap text-sm">{listing.condition}</p></div><div><h3 className="mb-2 text-sm font-semibold">Lokasi pickup</h3><p className="m-0">{listing.location.area}</p></div>{listing.mode === 'SELL' && <p className="m-0 font-semibold">{priceText(listing.unit_price)} / {listing.unit}</p>}{claimAction}<p className="m-0 text-xs text-muted">Tidak ada pembayaran di platform.</p></aside>
    </div>
  </article>
}
