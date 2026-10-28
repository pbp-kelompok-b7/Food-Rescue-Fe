import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import AgreementSummary from '../../components/transactions/AgreementSummary.tsx'
import TransactionFooter from '../../components/transactions/TransactionFooter.tsx'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import { ApiError } from '../../services/api.ts'
import { reservationsApi } from '../../services/reservations.ts'
import { claimable, deadlineText, priceText, quantityText, supplyError, supplyLabel } from './model.ts'
import { claimError, claimFieldError, claimStep, unitPrecision, validateClaimQuantity } from './claim.ts'
import useListing from './useListing.ts'

export default function ClaimForm() {
  const { id = '' } = useParams()
  const result = useListing(id)
  const reference = useReferenceData()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [quantity, setQuantity] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [conflict, setConflict] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])

  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat supply…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Supply belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/supply">Cari resource</Link></>}>{supplyError(result.error)}</PageState></div>

  const listing = result.data
  const detailTo = `/supply/${listing.id}`
  const owner = auth.status === 'authenticated' && String(auth.user?.id) === String(listing.owner.id)
  const available = claimable(listing, now)
  const expired = Date.parse(listing.available_until) <= now && listing.status === 'AVAILABLE'
  const unit = reference.status === 'ready' ? unitPrecision(reference.data, listing.unit) : { allows_decimal: false, max_decimal_places: 0 }
  const step = claimStep(unit)
  const maxAvailable = Number(listing.quantity_available)
  const availableText = quantityText(listing.quantity_available)
  // "Tersedia 7 box. Pilih 1–7 box." for whole units; a decimal-aware variant for kg.
  const quantityHint = `Tersedia ${availableText} ${listing.unit}. Pilih ${unit.allows_decimal && unit.max_decimal_places > 0 ? `hingga ${availableText}` : `1–${availableText}`} ${listing.unit}.`
  const sharingLabel = listing.mode === 'SELL' ? `${supplyLabel('SELL')} · ${priceText(listing.unit_price)} / ${listing.unit}` : supplyLabel('DONATE')
  const canSubmit = available && !owner && reference.status === 'ready' && auth.status === 'authenticated'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !canSubmit) return
    setFailure(undefined); setConflict(false)
    if (auth.status !== 'authenticated') {
      navigate('/login', { replace: true, state: { from: location.pathname + location.search } })
      return
    }
    const message = reference.status === 'ready' ? validateClaimQuantity(quantity, listing, reference.data) : 'Pilihan satuan belum dimuat.'
    if (message) { setFieldError(message); setFailure('Periksa jumlah yang kamu masukkan sebelum mengajukan.'); return }
    setFieldError(undefined)
    pending.current = true; setSubmitting(true)
    try {
      const reservation = await reservationsApi.claim(listing.id, { quantity })
      if (!mounted.current) return
      navigate(`/reservations/${reservation.id}`, { replace: true, state: { reservationCreated: true } })
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof ApiError && error.status === 401) {
        auth.clearSession()
        navigate('/login', { replace: true, state: { from: location.pathname + location.search } })
        return
      }
      setFailure(claimError(error))
      if (error instanceof ApiError) {
        setConflict(error.status === 409)
        setFieldError(claimFieldError(error))
      }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false) }
  }

  const statusNotice = owner
    ? <Alert tone="warning" title="Ini supply milikmu"><p>Kamu tidak dapat mengajukan claim untuk resource milikmu sendiri.</p></Alert>
    : expired
      ? <Alert tone="warning" title="Supply kedaluwarsa"><p>Batas pickup resource ini sudah terlewati, sehingga claim tidak dapat diajukan.</p></Alert>
      : !available
        ? <Alert tone="warning" title="Supply tidak tersedia"><p>Resource ini sedang tidak menerima claim. Muat ulang untuk melihat status terbaru.</p></Alert>
        : null

  const summary = <AgreementSummary
    reference={`${supplyLabel(listing.resource_type)}`}
    title={listing.title}
    provider={listing.owner.display_name}
    receiver={auth.status === 'authenticated' ? (auth.user?.display_name || 'Kamu') : 'Kamu'}
    quantity={Number(availableText)}
    unit={listing.unit}
    sharingLabel={sharingLabel}
    deadlineLabel="Batas konsumsi"
    deadline={deadlineText(listing.available_until)}
    location={listing.location.area}
    condition={listing.condition}
  />

  const form = <section className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:p-6" data-node-id="79:1629">
    <h2 className="m-0 text-xl font-bold leading-normal">Berapa yang kamu butuhkan?</h2>
    {statusNotice}
    {failure && <Alert tone="danger" title="Claim belum diajukan"><p>{failure}</p>{conflict && <Link to={detailTo} target="_blank" rel="noopener noreferrer">Periksa detail terbaru</Link>}</Alert>}
    <form className="flex flex-col gap-4" noValidate onSubmit={submit} aria-busy={submitting}>
      <fieldset disabled={!canSubmit || submitting} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="sr-only">Jumlah claim</legend>
        <FormField label={`Jumlah (${listing.unit})`} hint={quantityHint} error={fieldError}>
          <Input name="quantity" inputMode="decimal" type="number" min={step} max={maxAvailable} step={step} value={quantity} disabled={!canSubmit || submitting} onChange={event => { setQuantity(event.target.value); setFieldError(undefined) }} placeholder={`Jumlah ${listing.unit}`} />
        </FormField>
        <div className="flex flex-col gap-1">
          <p className="m-0 text-sm text-muted">Cara berbagi</p>
          <p className="m-0 font-bold">{sharingLabel}</p>
        </div>
        {listing.mode === 'SELL' && <p className="m-0 text-sm">Perkiraan total: <strong>{Number(quantity) > 0 ? priceText(String(Number(quantity) * Number(listing.unit_price))) : '—'}</strong><span className="text-muted"> (harga mengikuti listing, tanpa negosiasi)</span></p>}
        <p className="m-0 text-base text-muted">Provider akan meninjau pengajuanmu sebelum jumlah dialokasikan.</p>
        <Button className="w-full" type="submit" loading={submitting}>{submitting ? 'Mengajukan claim…' : 'Ajukan claim'}</Button>
        <Link className="fr-button w-full not-disabled:border not-disabled:border-outline not-disabled:bg-surface not-disabled:text-ink not-disabled:shadow-none" to={detailTo}>Kembali ke listing</Link>
      </fieldset>
    </form>
    <p className="m-0 text-sm text-muted">Periksa kondisi dan deadline sebelum mengajukan.</p>
  </section>

  return <div className="mx-auto flex max-w-290 flex-col gap-6 px-4 py-6 nav:px-24 nav:py-10">
    <Link className="inline-flex min-h-11 items-center text-sm text-link" to="/reservations">← Reservasi saya</Link>
    <header className="flex flex-col gap-3">
      <h1 className="supply-heading">Ajukan claim</h1>
      <p className="m-0 text-base text-muted">{supplyLabel(listing.resource_type)} · Anda receiver</p>
      {/* Mobile-only resource recap (Figma mobile frame 79:1648); desktop shows this in the summary card instead. */}
      <p className="m-0 text-base text-muted nav:hidden">{listing.title} · {availableText} {listing.unit} · {sharingLabel}</p>
    </header>
    <div className="grid items-start gap-6 nav:grid-cols-2">
      <div className="order-2 nav:order-1">{summary}</div>
      <div className="order-1 nav:order-2">{form}</div>
    </div>
    <TransactionFooter />
  </div>
}
