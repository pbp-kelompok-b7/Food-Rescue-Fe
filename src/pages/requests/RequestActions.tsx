import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Textarea from '../../components/ui/Textarea.tsx'
import { ApiError } from '../../services/api.ts'
import { requestsApi, type ResourceRequest } from '../../services/requests.ts'
import { canCloseRequest, requestWriteError } from './model.ts'

export default function RequestActions({ request, onChanged, inHistory = false }: { request: ResourceRequest; onChanged: (message: string) => void; inHistory?: boolean }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [action, setAction] = useState<'close' | 'delete' | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const [, tick] = useState(0)
  const pending = useRef(false)
  const mounted = useRef(true)
  const reasonInput = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const remaining = Date.parse(request.valid_until) - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) return
    const timer = setTimeout(() => tick(value => value + 1), Math.min(remaining + 50, 2_147_483_647))
    return () => clearTimeout(timer)
  }, [request.valid_until])
  const permitted = auth.status === 'authenticated' && (String(auth.user?.id) === String(request.owner.id) || auth.user?.is_admin)
  if (!permitted) return null
  function open(next: 'close' | 'delete') { setAction(next); setReason(''); setError(undefined); setReasonError(undefined) }
  async function confirm() {
    if (pending.current || !action) return
    if (action === 'close' && (!reason.trim() || reason.trim().length > 1000)) {
      setReasonError('Isi alasan penutupan sepanjang 1–1000 karakter.'); reasonInput.current?.focus(); return
    }
    pending.current = true; setLoading(true); setError(undefined); setReasonError(undefined)
    try {
      if (action === 'close') await requestsApi.close(request.id, reason.trim())
      else await requestsApi.remove(request.id)
      if (!mounted.current) return
      const message = action === 'close' ? 'Request berhasil ditutup.' : 'Request berhasil dihapus atau diarsipkan.'
      setAction(null)
      if (action === 'delete' && !inHistory) navigate('/my/requests', { replace: true, state: { requestNotice: message } })
      else onChanged(message)
    } catch (failure) {
      if (!mounted.current) return
      if (failure instanceof ApiError && failure.status === 401) {
        auth.clearSession(); navigate('/login', { replace: true, state: { from: location.pathname + location.search } }); return
      }
      setError(failure)
      if (action === 'close' && failure instanceof ApiError && failure.status === 400) {
        setReasonError(failure.errors.filter(item => item.field === 'reason').map(item => item.message.slice(0, 300)).join(' ') || undefined)
      }
      if (failure instanceof ApiError && [403, 404, 409].includes(failure.status)) onChanged('')
    } finally { pending.current = false; if (mounted.current) setLoading(false) }
  }
  const message = error instanceof ApiError && error.status === 409 ? 'Request sudah berubah, kedaluwarsa, atau tidak dapat ditutup. Periksa status terbaru sebelum mencoba lagi.' : requestWriteError(error)
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2">
      {inHistory && <Link className="fr-button" to={`/requests/${request.id}/edit`}>Edit request</Link>}
      {canCloseRequest(request) && <Button variant="secondary" onClick={() => open('close')}>Tutup request</Button>}
      {!request.archived_at && <Button variant="destructive" onClick={() => open('delete')}>Hapus / arsipkan</Button>}
      <Link className="inline-flex min-h-11 items-center text-sm" to="/reservations?source_type=REQUEST_OFFER">Buka reservasi</Link>
    </div>
    <ConfirmDialog open={action !== null} title={action === 'close' ? 'Tutup request?' : 'Hapus atau arsipkan request?'} confirmLabel={action === 'close' ? 'Ya, tutup request' : 'Ya, hapus / arsipkan'} destructive loading={loading} onCancel={() => { if (!pending.current) setAction(null) }} onConfirm={() => void confirm()}>
      {action === 'close' ? <><p>Penutupan menghentikan penawaran baru dan membatalkan reservasi PENDING. Reservasi ACCEPTED, alokasi, dan pickup yang sudah disepakati tetap berjalan.</p><FormField label="Alasan penutupan" error={reasonError} required><Textarea ref={reasonInput} name="close_reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} disabled={loading} /></FormField></> : <><p>Request tanpa riwayat reservasi akan dihapus permanen. Jika ada riwayat, termasuk reservasi ditolak atau dibatalkan, request akan diarsipkan.</p><p>Reservasi PENDING dibatalkan. Reservasi ACCEPTED, alokasi, snapshot, dan pickup tetap tersimpan serta dapat dilanjutkan melalui reservasi.</p></>}
      {error !== undefined && <Alert tone="danger" title="Tindakan belum berhasil"><p>{message}</p></Alert>}
    </ConfirmDialog>
  </div>
}
