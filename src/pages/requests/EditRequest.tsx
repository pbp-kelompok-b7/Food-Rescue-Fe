import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import PageState from '../../components/PageState.tsx'
import Button from '../../components/ui/Button.tsx'
import { ApiError } from '../../services/api.ts'
import { requestsApi, type ResourceRequest } from '../../services/requests.ts'
import RequestForm from './RequestForm.tsx'
import { requestError } from './model.ts'

export default function EditRequest() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const key = `${id}:${auth.status}:${auth.user?.id || ''}`
  const [result, setResult] = useState<{ key: string; data?: ResourceRequest; error?: unknown }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => requestsApi.detail(id, { signal: controller.signal })).then(data => {
      if (!controller.signal.aborted) setResult({ key, data })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, error })
    })
    return () => controller.abort()
  }, [id, key, attempt])
  const data = result.key === key ? result.data : undefined
  const error = result.key === key ? result.error : undefined
  const { clearSession, status } = auth
  useEffect(() => { if (status === 'authenticated' && error instanceof ApiError && error.status === 401) clearSession() }, [error, status, clearSession])
  if (error !== undefined) return <PageState error title="Request belum dapat diedit" action={<Button onClick={() => { setResult({ key }); setAttempt(value => value + 1) }}>Coba lagi</Button>}>{requestError(error)}</PageState>
  if (!data) return <p role="status">Memuat request…</p>
  if (auth.status !== 'authenticated' || (!auth.user?.is_admin && String(auth.user?.id) !== String(data.owner.id))) return <PageState error title="Akses ditolak" action={<Link to={`/requests/${id}`}>Kembali ke detail</Link>}>Hanya pemilik request atau staff yang dapat mengedit kebutuhan ini.</PageState>
  return <RequestForm key={`${key}:${data.version}:${data.updated_at}`} initial={data} />
}
