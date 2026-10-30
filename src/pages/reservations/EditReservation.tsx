import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Alert from '../../components/ui/Alert.tsx'
import Badge from '../../components/ui/Badge.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import useReferenceData from '../../components/resources/useReferenceData.ts'
import { decimalError } from '../../components/resources/resourceFields.ts'
import { ApiError } from '../../services/api.ts'
import { reservationsApi } from '../../services/reservations.ts'
import useReservation from './useReservation.ts'
import { actionError, actionFieldError, approverOf, quantityText, reservationError, reservationLabel, reservationRef, sharingText } from './model.ts'

export default function EditReservation() {
  const { id = '' } = useParams()
  const result = useReservation(id)
  const reference = useReferenceData()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [quantity, setQuantity] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  if (result.status === 'loading') return <div className="supply-container" role="status">Memuat reservation…</div>
  if (result.status === 'error') return <div className="supply-container"><PageState error title="Reservation belum dapat dibuka" action={<><Button onClick={result.retry}>Coba lagi</Button><Link className="fr-button ml-3" to="/reservations">Reservasi saya</Link></>}>{reservationError(result.error)}</PageState></div>

  const reservation = result.data
  const detailTo = `/reservations/${reservation.id}`
  const terms = reservation.terms
  const viewerId = auth.status === 'authenticated' ? String(auth.user?.id) : null
  const isSubmitter = viewerId !== null && String(reservation.submitted_by_id) === viewerId
  const isPending = reservation.status === 'PENDING'
  const unit = reference.status === 'ready' ? reference.data.units.find(item => item.code === terms.unit) : undefined
  const step = unit && unit.allows_decimal && unit.max_decimal_places > 0 ? 10 ** -unit.max_decimal_places : 1
  const current = quantity ?? quantityText(terms.quantity)
  const canSubmit = isPending && isSubmitter && auth.status === 'authenticated'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !canSubmit) return
    setFailure(undefined)
    if (auth.status !== 'authenticated') { navigate('/login', { replace: true, state: { from: location.pathname + location.search } }); return }
    // Local precision/positivity check; backend remains the source of truth.
    const message = decimalError(current, unit ? (unit.allows_decimal ? unit.max_decimal_places : 0) : 0, false, 9)
    if (message) { setFieldError(message); setFailure('Periksa jumlah yang kamu masukkan.'); return }
    setFieldError(undefined)
    pending.current = true; setSubmitting(true)
    try {
      // expected_version comes from the data we last loaded (optimistic concurrency).
      await reservationsApi.revise(reservation.id, { quantity: current, expected_version: reservation.version })
      if (!mounted.current) return
      navigate(detailTo, { replace: true, state: { reservationRevised: true } })
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof ApiError && error.status === 401) {
        auth.clearSession()
        navigate('/login', { replace: true, state: { from: location.pathname + location.search } })
        return
      }
      setFailure(actionError(error))
      if (error instanceof ApiError) setFieldError(actionFieldError(error))
      // A stale version / changed status means our copy is outdated — reload it
      // so the user reconfirms against the latest quantity (contract 7.4.5).
      if (error instanceof ApiError && error.status === 409) { setQuantity(null); result.retry() }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false) }
  }

  const blocked = !isPending
    ? <Alert tone="warning" title={`Status: ${reservationLabel(reservation.status)}`}><p>Hanya pengajuan yang masih menunggu persetujuan yang dapat direvisi.</p></Alert>
    : !isSubmitter
      ? <Alert tone="warning" title="Tidak dapat merevisi"><p>Hanya pengaju yang dapat mengubah jumlah pengajuan ini.</p></Alert>
      : null

  return <div className="mx-auto flex max-w-205 flex-col gap-6 px-4 py-6 nav:px-10 nav:py-12">
    <Link className="inline-flex min-h-11 items-center text-sm text-link" to={detailTo}>← Kembali ke detail</Link>
    <header className="flex flex-col gap-2">
      <p className="supply-caption">RESERVATION / UBAH JUMLAH</p>
      <h1 className="supply-heading">Ubah jumlah</h1>
      <p className="m-0 text-base text-muted">{reservationRef(reservation.id)} · {terms.title}</p>
      <Badge status={reservation.status}>{reservationLabel(reservation.status)}</Badge>
    </header>
    {blocked}
    {failure && <Alert tone="danger" title="Perubahan belum disimpan"><p>{failure}</p></Alert>}
    <section className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 nav:p-6">
      <div className="flex flex-col gap-1"><p className="m-0 text-sm text-muted">Kesepakatan saat ini</p><p className="m-0 font-semibold">{quantityText(terms.quantity)} {terms.unit} · {sharingText(reservation)}</p></div>
      <p className="m-0 text-sm text-muted">Hanya jumlah yang dapat direvisi. Harga, satuan, mode, dan pihak transaksi tidak berubah. Keputusan tetap di {approverOf(reservation).display_name}.</p>
      <form className="flex flex-col gap-4" noValidate onSubmit={submit} aria-busy={submitting}>
        <fieldset disabled={!canSubmit || submitting} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          <legend className="sr-only">Revisi jumlah</legend>
          <FormField label={`Jumlah baru (${terms.unit})`} hint={unit && unit.allows_decimal ? `Hingga ${unit.max_decimal_places} angka desimal.` : 'Gunakan bilangan bulat.'} error={fieldError}>
            <Input name="quantity" inputMode="decimal" type="number" min={step} step={step} value={current} disabled={!canSubmit || submitting} onChange={event => { setQuantity(event.target.value); setFieldError(undefined) }} />
          </FormField>
          <Button className="w-full" type="submit" loading={submitting}>{submitting ? 'Menyimpan…' : 'Simpan jumlah'}</Button>
        </fieldset>
      </form>
      <Link className="self-start text-sm text-link" to={detailTo}>Batal</Link>
    </section>
  </div>
}
