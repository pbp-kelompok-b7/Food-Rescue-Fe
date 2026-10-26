import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from './useAuth.ts'
import { login, register } from '../services/auth.ts'
import { ApiError } from '../services/api.ts'
import Alert from '../components/ui/Alert.tsx'
import Button from '../components/ui/Button.tsx'
import FormField from '../components/ui/FormField.tsx'
import Input from '../components/ui/Input.tsx'

// Redirects must stay in this app and must not lead back into the auth forms.
function safeDestination(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/'
  const url = new URL(value, 'https://food-rescue.invalid')
  if (url.origin !== 'https://food-rescue.invalid' || /^\/(login|register)\/?$/i.test(url.pathname)) return '/'
  return url.pathname + url.search + url.hash
}

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.'
  if (error.status === 401 || error.errors.some(item => item.code === 'invalid_credentials')) return 'Email atau kata sandi salah, atau akun tidak aktif.'
  if (error.errors.some(item => item.code === 'csrf_failed')) return 'Verifikasi keamanan gagal. Coba kirim kembali untuk memperbarui token keamanan.'
  if (error.status === 403) return 'Permintaan ditolak. Coba lagi atau periksa sesi akunmu.'
  if (error.status === 409) return 'Email sudah terdaftar. Gunakan email lain atau masuk ke akunmu.'
  if (error.status === 429) return 'Terlalu banyak percobaan. Tunggu beberapa saat sebelum mencoba lagi.'
  if (error.status === 501) return 'Layanan autentikasi belum tersedia di server. Coba lagi nanti.'
  if (error.status === 400) return 'Periksa kembali data yang kamu isi.'
  return 'Layanan autentikasi sedang bermasalah. Coba lagi nanti.'
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register'
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { from?: unknown; registered?: boolean; email?: string } | null
  const destination = safeDestination(new URLSearchParams(location.search).get('next') ?? state?.from)
  const nextQuery = destination === '/' ? '' : `?next=${encodeURIComponent(destination)}`
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const errorRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') || '').trim().toLowerCase()
    const password = String(data.get('password') || '')
    const displayName = String(data.get('display_name') || '').trim()
    const whatsapp = String(data.get('whatsapp_number') || '').trim()
    const errors: Record<string, string> = {}
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Masukkan email yang valid.'
    if (!password || password.length > 128 || (registering && password.length < 8)) errors.password = !password ? 'Masukkan kata sandi.' : 'Masukkan kata sandi yang valid.'
    if (registering && (!displayName || displayName.length > 100)) errors.display_name = 'Masukkan nama yang valid.'
    if (registering && whatsapp && !/^\+[1-9]\d{7,14}$/.test(whatsapp)) errors.whatsapp_number = 'Masukkan nomor WhatsApp dengan kode negara, misalnya +6281234567890.'
    setFieldErrors(errors)
    setError(null)
    if (Object.keys(errors).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus()
      return
    }
    pending.current = true
    setSubmitting(true)
    try {
      if (registering) {
        await register({ email, password, display_name: displayName, whatsapp_number: whatsapp || null })
        form.reset()
        navigate(`/login${nextQuery}`, { replace: true, state: { registered: true, email } })
      } else {
        await login({ email, password })
        // Resolve the actual server session before exposing protected destinations.
        const session = await auth.refresh()
        if (session.status !== 'authenticated') throw session.error || new ApiError('Session unavailable', 401, null)
        form.reset()
        navigate(destination, { replace: true })
      }
    } catch (failure) {
      if (failure instanceof ApiError) {
        const fields: Record<string, string> = {}
        for (const item of failure.errors) {
          if (item.field && ['email', 'password', 'display_name', 'whatsapp_number'].includes(item.field)) {
            fields[item.field] = [fields[item.field], item.message].filter(Boolean).join(' ')
          }
        }
        setFieldErrors(fields)
      }
      setError(errorMessage(failure))
      // Wait for React to mount the error summary before moving focus to it.
      requestAnimationFrame(() => errorRef.current?.focus())
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  if (auth.status === 'authenticated' && !submitting) return <Navigate to={destination} replace />

  return (
    <section className="flex w-full max-w-100 min-w-0 flex-col gap-5" aria-labelledby="auth-heading">
        <h1 id="auth-heading" className="m-0 font-brand text-[28px] font-semibold leading-[1.2]">{registering ? 'Buat akun' : 'Selamat datang kembali'}</h1>
        <p className="m-0 text-sm leading-normal text-muted">{registering ? 'Mulai berbagi dan temukan yang kamu butuhkan.' : 'Masuk untuk melanjutkan aktivitasmu.'}</p>
        {auth.status === 'loading' && !submitting && <p className="m-0" role="status">Memeriksa sesi…</p>}
        {auth.status === 'error' && (
          <Alert tone="danger" title="Sesi belum dapat diperiksa">
            <p>{errorMessage(auth.error)}</p>
            <Button variant="secondary" className="mt-3" onClick={() => auth.refresh()}>Coba lagi</Button>
          </Alert>
        )}
            {!registering && state?.registered && <Alert tone="success" title="Akun berhasil dibuat">Silakan masuk dengan akun barumu.</Alert>}
            {error && <div ref={errorRef} tabIndex={-1}><Alert tone="danger" title={registering ? 'Belum berhasil mendaftar' : 'Belum berhasil masuk'}>{error}</Alert></div>}
            <Button variant="secondary" disabled className="h-12 w-full gap-2 shadow-none"><img src="/assets/figma/auth-google-g.png" alt="" width={18} height={18} className="size-4.5 object-contain" />Lanjutkan dengan Google</Button>
            <div className="flex h-5 items-center gap-2 text-[13px] leading-5 text-muted">
              <span className="h-px flex-1 bg-border" />
              <span>atau gunakan email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-busy={submitting}>
              <fieldset disabled={submitting || auth.status === 'loading'} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
                <legend className="sr-only">{registering ? 'Data pendaftaran' : 'Kredensial akun'}</legend>
                {registering && <FormField label="Nama" error={fieldErrors.display_name} className="min-h-21">
                  <Input name="display_name" required autoComplete="nickname" maxLength={100} placeholder="Nama lengkap" />
                </FormField>}
                <FormField label="Email" error={fieldErrors.email} className="min-h-21">
                  <Input name="email" required type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} placeholder="nama@contoh.com" defaultValue={registering ? '' : state?.email || ''} />
                </FormField>
                <FormField label="Kata sandi" error={fieldErrors.password} className="min-h-21">
                  <Input name="password" required type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} maxLength={128} placeholder="Masukkan kata sandi" />
                </FormField>
                {registering && <FormField label="Nomor WhatsApp (opsional)" error={fieldErrors.whatsapp_number} hint="Bisa diisi nanti. Wajib sebelum pickup." className="min-h-27">
                  <Input name="whatsapp_number" type="tel" autoComplete="tel" placeholder="+6281234567890" maxLength={16} />
                </FormField>}
              </fieldset>
              {registering && <p className="m-0 text-xs leading-normal text-muted">Kontak tidak ditampilkan di publik. Hanya pasangan transaksi dan admin yang dapat melihatnya setelah reservasi diterima.</p>}
              <Button type="submit" loading={submitting} disabled={auth.status === 'loading'} className="h-12 w-full">{submitting ? (registering ? 'Sedang mendaftar…' : 'Sedang masuk…') : (registering ? 'Daftar' : 'Masuk')}</Button>
            </form>
            <Link to={`${registering ? '/login' : '/register'}${nextQuery}`} className="flex min-h-11 items-center justify-center text-sm font-semibold">{registering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}</Link>
    </section>
  )
}
