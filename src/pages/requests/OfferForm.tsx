import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import LocationSearch from '../../components/location/LocationSearch.tsx'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import Select from '../../components/ui/Select.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import { ApiError } from '../../services/api.ts'
import { reservationsApi } from '../../services/reservations.ts'
import { emptyOffer, offerable, offerError, offerFieldErrors, offerLabel, offerPayload, priceText, quantityText, validateOffer, type OfferValues } from './offer.ts'
import useRequest from './useRequest.ts'

export default function OfferForm() {
  const { id = '' } = useParams()
  const result = useRequest(id)
  const reference = useReferenceData()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState<OfferValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string>()
  const [conflict, setConflict] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  const formRef = useRef<HTMLFormElement>(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])

  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat request…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Request belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/requests">Papan request</Link></>}>{offerError(result.error)}</PageState></div>

  const request = result.data
  const detailTo = `/requests/${request.id}`
  const owner = auth.status === 'authenticated' && String(auth.user?.id) === String(request.owner.id)
  const available = offerable(request, now)
  const expired = Date.parse(request.valid_until) <= now && request.status === 'OPEN'
  const current = value || emptyOffer()
  const canSubmit = available && !owner && reference.status === 'ready' && auth.status === 'authenticated'
  const patch = (next: Partial<OfferValues>) => setValue(previous => ({ ...(previous || emptyOffer()), ...next }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !canSubmit || reference.status !== 'ready') return
    if (auth.status !== 'authenticated') { navigate('/login', { replace: true, state: { from: location.pathname + location.search } }); return }
    const nextErrors = validateOffer(current, request, reference.data)
    setErrors(nextErrors); setFailure(undefined); setConflict(false)
    if (Object.keys(nextErrors).length) {
      setFailure('Periksa informasi yang ditandai sebelum menawarkan.')
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"] input, input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"]')?.focus())
      return
    }
    pending.current = true; setSubmitting(true)
    try {
      const reservation = await reservationsApi.offer(request.id, offerPayload(current, request))
      if (!mounted.current) return
      navigate(`/reservations/${reservation.id}`, { replace: true, state: { reservationCreated: true } })
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof ApiError && error.status === 401) {
        auth.clearSession()
        navigate('/login', { replace: true, state: { from: location.pathname + location.search } })
        return
      }
      setFailure(offerError(error))
      if (error instanceof ApiError) {
        setConflict(error.status === 409)
        setErrors(offerFieldErrors(error))
      }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false) }
  }

  const statusNotice = owner
    ? <Alert tone="warning" title="Ini request milikmu"><p>Kamu tidak dapat menawarkan resource untuk request milikmu sendiri.</p></Alert>
    : expired
      ? <Alert tone="warning" title="Request kedaluwarsa"><p>Batas penerimaan penawaran sudah terlewati, sehingga penawaran tidak dapat diajukan.</p></Alert>
      : !available
        ? <Alert tone="warning" title="Request tidak menerima penawaran"><p>Request ini sedang tidak menerima penawaran. Muat ulang untuk melihat status terbaru.</p></Alert>
        : null

  const requestDescriptor = reference.status === 'ready' ? (reference.data.categories.find(item => item.code === request.category)?.label || request.category) : request.category
  return <div className="mx-auto flex max-w-205 flex-col gap-6 px-4 py-6 nav:px-10 nav:py-12">
    <header className="flex w-full flex-col gap-2">
      <p className="supply-caption">REQUEST / TAWARKAN RESOURCE</p>
      <h1 className="supply-heading">Tawarkan resource</h1>
      {/* Figma intro: request reference + its descriptor (requests carry no title). */}
      <p className="m-0 text-base text-muted">Untuk RQ-{String(request.id).padStart(3, '0')} · {requestDescriptor} · sisa {quantityText(request.quantity_remaining)} {request.unit}{request.donate_only ? ' · donasi saja' : request.max_unit_price !== null ? ` · maks ${priceText(request.max_unit_price)}/${request.unit}` : ''}.</p>
    </header>
    {statusNotice}
    {failure && <Alert tone="danger" title="Penawaran belum diajukan"><p>{failure}</p>{conflict && <Link to={detailTo} target="_blank" rel="noopener noreferrer">Periksa detail terbaru</Link>}</Alert>}
    {reference.status === 'loading' && <p role="status">Memuat pilihan resource…</p>}
    {reference.status === 'error' && <PageState error title="Pilihan resource belum tersedia" action={<Button onClick={reference.retry}>Coba lagi</Button>}>Pilihan satuan perlu dimuat sebelum form dapat digunakan.</PageState>}
    {reference.status === 'ready' && <form ref={formRef} className="flex flex-col gap-7 rounded-xl bg-surface p-4 nav:p-7" noValidate onSubmit={submit} aria-busy={submitting}>
      <fieldset disabled={!canSubmit || submitting} className="m-0 flex min-w-0 flex-col gap-7 border-0 p-0">
        <legend className="sr-only">Detail penawaran</legend>
        <section className="flex flex-col gap-4" aria-labelledby="offer-resource"><h2 id="offer-resource" className="m-0 text-lg font-semibold">Resource yang ditawarkan</h2>
          <FormField label="Nama resource" error={errors.title}><Input name="title" value={current.title} onChange={event => patch({ title: event.target.value })} maxLength={200} placeholder="Contoh: Ampas kopi dari kedai" /></FormField>
          <FormField label="Deskripsi" error={errors.description}><Textarea name="description" value={current.description} onChange={event => patch({ description: event.target.value })} maxLength={5000} placeholder="Jelaskan resource yang kamu tawarkan" /></FormField>
          {/* Type and category are fixed by the request; shown read-only. */}
          <p className="m-0 text-sm font-semibold text-primary-hover">{offerLabel(request.resource_type)} · {reference.data.categories.find(item => item.code === request.category)?.label || request.category}</p>
          <FormField label="Kondisi" error={errors.condition}><Textarea name="condition" value={current.condition} onChange={event => patch({ condition: event.target.value })} maxLength={1000} placeholder="Kondisi, penyimpanan, atau catatan penting" /></FormField>
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="offer-quantity"><h2 id="offer-quantity" className="m-0 text-lg font-semibold">Jumlah penawaran</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Jumlah" hint={`Sisa ${quantityText(request.quantity_remaining)} ${request.unit}.`} error={errors.quantity}><Input name="quantity" inputMode="decimal" value={current.quantity} onChange={event => patch({ quantity: event.target.value })} placeholder={`Jumlah ${request.unit}`} /></FormField>
            <FormField label="Satuan" hint="Mengikuti satuan request."><Input name="unit" value={request.unit} readOnly disabled /></FormField>
          </div>
          {request.donate_only
            ? <div className="rounded-md bg-primary-container p-3 text-sm font-semibold text-primary-hover">Request ini hanya menerima donasi.</div>
            : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Cara berbagi" error={errors.mode}><Select name="mode" value={current.mode} onChange={event => patch({ mode: event.target.value as OfferValues['mode'], unit_price: event.target.value === 'DONATE' ? '0.00' : '' })} options={reference.data.modes.map(item => ({ value: item.code, label: item.label }))} /></FormField>
                {current.mode === 'SELL' && <FormField label="Harga per satuan (Rp)" hint={request.max_unit_price !== null ? `Maksimal ${priceText(request.max_unit_price)} / ${request.unit}.` : undefined} error={errors.unit_price}><Input name="unit_price" inputMode="decimal" value={current.unit_price} onChange={event => patch({ unit_price: event.target.value })} placeholder="Harga per satuan" /></FormField>}
              </div>}
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="offer-location"><h2 id="offer-location" className="m-0 text-lg font-semibold">Lokasi &amp; ketersediaan</h2>
          <div><h3 className="mb-2 text-sm font-semibold">Lokasi resource</h3><LocationSearch value={current.location} onChange={next => patch({ location: next })} disabled={!canSubmit || submitting} error={errors.location} /></div>
          <FormField label="Tersedia sampai" error={errors.deadline}><Input name="resource_deadline" type="datetime-local" value={current.deadline} onChange={event => patch({ deadline: event.target.value })} /></FormField>
          <p className="m-0 text-sm text-muted">Lokasi ini dipakai untuk pickup setelah tawaran diterima. Waktu Indonesia Barat (WIB).</p>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-full sm:flex-1" type="submit" loading={submitting}>{submitting ? 'Mengajukan penawaran…' : 'Ajukan penawaran'}</Button>
          <Link className="fr-button w-full sm:flex-1 not-disabled:border not-disabled:border-outline not-disabled:bg-surface not-disabled:text-ink not-disabled:shadow-none" to={detailTo}>Batal</Link>
        </div>
        <p className="m-0 text-sm text-muted">Jumlah dapat diperbarui sebelum penawaran disetujui. Penawaran PENDING tidak mengurangi sisa kebutuhan.</p>
      </fieldset>
    </form>}
  </div>
}
