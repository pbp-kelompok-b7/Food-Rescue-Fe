import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { getProfile, updateProfile, logout } from '../../services/auth.ts'
import { ApiError } from '../../services/api.ts'
import type { User } from '../../services/types.ts'
import Alert from '../../components/ui/Alert.tsx'
import Button from '../../components/ui/Button.tsx'
import FormField from '../../components/ui/FormField.tsx'
import Input from '../../components/ui/Input.tsx'
import ErrorState from '../../components/ui/ErrorState.tsx'
import Toast from '../../components/ui/Toast.tsx'

export const meta = () => [{ title: 'Profil | Food Rescue' }]

export default function Page() {
  const auth = useAuth()
  const clearSession = auth.clearSession
  const [profile, setProfile] = useState<User | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<'save' | 'logout' | null>(null)
  const pending = useRef(false)
  const lifetime = useRef<AbortController | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const summary = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    getProfile({ signal: controller.signal }).then(user => {
      if (!controller.signal.aborted) setProfile(user)
    }).catch(failure => {
      if (controller.signal.aborted) return
      if (failure instanceof ApiError && failure.status === 401) clearSession()
      else setLoadError(true)
    })
    return () => controller.abort()
  }, [attempt, clearSession])

  function report(failure: unknown) {
    if (failure instanceof ApiError && failure.status === 401) { clearSession(); return }
    const fields: Record<string, string> = {}
    if (failure instanceof ApiError) {
      for (const item of failure.errors) {
        if (item.field && ['display_name', 'whatsapp_number'].includes(item.field)) fields[item.field] = item.message
      }
    }
    setErrors(fields)
    setError(failure instanceof ApiError && failure.status === 400 ? 'Periksa kembali data yang kamu isi.'
      : failure instanceof ApiError && failure.errors.some(item => item.code === 'csrf_failed') ? 'Verifikasi keamanan gagal. Coba lagi untuk memperbarui token keamanan.'
      : 'Permintaan gagal. Periksa koneksi dan coba lagi.')
    requestAnimationFrame(() => summary.current?.focus())
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const display_name = String(data.get('display_name') || '').trim()
    const whatsapp_number = String(data.get('whatsapp_number') || '').trim() || null
    const fields: Record<string, string> = {}
    if (!display_name || display_name.length > 100) fields.display_name = 'Masukkan nama sepanjang 1–100 karakter.'
    if (whatsapp_number && !/^\+[1-9]\d{7,14}$/.test(whatsapp_number)) fields.whatsapp_number = 'Gunakan kode negara tanpa spasi, misalnya +6281234567890.'
    setErrors(fields); setError(null); setSaved(false)
    if (Object.keys(fields).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(fields)[0]}"]`)?.focus()
      return
    }
    pending.current = true
    setBusy('save')
    const signal = lifetime.current!.signal
    try {
      const user = await updateProfile({ display_name, whatsapp_number }, signal)
      if (signal.aborted) return
      setProfile(user)
      form.querySelector<HTMLInputElement>('[name="display_name"]')!.value = user.display_name || ''
      form.querySelector<HTMLInputElement>('[name="whatsapp_number"]')!.value = user.whatsapp_number || ''
      auth.syncUser(user)
      setSaved(true)
    } catch (failure) {
      if (!signal.aborted) report(failure)
    } finally {
      pending.current = false
      if (!signal.aborted) setBusy(null)
    }
  }

  async function leave() {
    if (pending.current) return
    pending.current = true
    setBusy('logout'); setError(null); setSaved(false)
    const signal = lifetime.current!.signal
    try {
      await logout()
      if (!signal.aborted) clearSession()
    } catch (failure) {
      if (!signal.aborted) report(failure)
    } finally {
      pending.current = false
      if (!signal.aborted) setBusy(null)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-150 flex-col gap-6" aria-labelledby="profile-heading">
      <Link to="/my/supply" className="flex min-h-11 items-center justify-center text-sm font-semibold no-underline">← Kembali ke aktivitas</Link>
      <p className="m-0 font-caption text-xs leading-4 text-primary">DASHBOARD / PROFIL</p>
      <h1 id="profile-heading" className="m-0 font-brand text-[28px] font-semibold leading-9 nav:text-[32px] nav:leading-10">Profil dan kontak</h1>
      <p className="m-0 text-base leading-6 text-muted nav:text-lg nav:leading-7">Perbarui informasi dasar dan kontak untuk koordinasi pickup.</p>
      {saved && <Toast onDismiss={() => setSaved(false)}>Profil berhasil diperbarui.</Toast>}
      {error && <div ref={summary} tabIndex={-1}><Alert tone="danger" title="Permintaan belum berhasil">{error}</Alert></div>}
      {loadError ? <ErrorState title="Profil gagal dimuat" onRetry={() => { setLoadError(false); setAttempt(value => value + 1) }} />
        : !profile ? <div role="status" aria-busy="true" className="rounded-2xl bg-surface p-8">Memuat profil…</div>
        : <form onSubmit={save} noValidate className="flex flex-col gap-5 nav:gap-6 nav:rounded-2xl nav:bg-surface nav:p-8" aria-busy={busy === 'save'} onChange={() => setSaved(false)}>
          <h2 className="m-0 font-sans text-xl font-semibold leading-7 nav:font-brand nav:text-[22px] nav:leading-[30px]">Informasi dasar</h2>
          <fieldset disabled={busy !== null} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 nav:gap-6">
            <legend className="sr-only">Informasi dasar</legend>
            <FormField label="Nama" error={errors.display_name} className="min-h-21">
              <Input name="display_name" defaultValue={profile.display_name || ''} autoComplete="name" maxLength={100} required />
            </FormField>
            <FormField label="Email" className="min-h-21">
              <Input type="email" value={profile.email || ''} readOnly autoComplete="email" />
            </FormField>
            <FormField label="Nomor WhatsApp" error={errors.whatsapp_number} className="min-h-37 nav:min-h-32" hint="Opsional saat daftar, wajib sebelum penjadwalan pickup. Kontak hanya dibuka untuk pasangan transaksi setelah ACCEPTED. Gunakan kode negara, misalnya +6281234567890; kosongkan untuk menghapus kontak.">
              <Input name="whatsapp_number" type="tel" defaultValue={profile.whatsapp_number || ''} autoComplete="tel" placeholder="+6281234567890" maxLength={16} />
            </FormField>
            <Button type="submit" className="h-11 w-full py-0" loading={busy === 'save'}>Simpan perubahan</Button>
          </fieldset>
        </form>}
      <div className="flex flex-col gap-6 nav:gap-4">
        <div className="hidden flex-col gap-4 nav:flex">
          <h2 className="m-0 font-brand text-[22px] font-semibold leading-[30px] text-primary-hover">Berbagi dan menerima,<br />tetap satu akun.</h2>
          <p className="m-0 text-base leading-6 text-muted">Kelola supply dan request milikmu, lalu lanjutkan kesepakatan lewat reservasi dan pickup.</p>
        </div>
        <Alert title="Koordinasi via WhatsApp">Setelah ACCEPTED, kontak tersedia bagi pasangan transaksi jika sudah diisi. Kedua pihak wajib melengkapi WhatsApp sebelum provider menjadwalkan pickup.</Alert>
        <Button variant="secondary" className="h-11 w-full py-0" onClick={leave} loading={busy === 'logout'} disabled={busy === 'save'}>Keluar dari akun</Button>
        <p className="m-0 text-sm leading-5 text-muted">Setelah keluar, kamu tetap bisa menjelajah sebagai tamu.</p>
      </div>
      <aside className="flex flex-col gap-2 text-sm leading-5 text-muted nav:border nav:border-border">
        <h2 className="m-0 font-caption text-xs font-normal leading-4">CATATAN AKSES &amp; KONTAK</h2>
        <p className="m-0 text-ink">Profil memerlukan autentikasi. Kamu hanya bisa mengelola data akunmu sendiri.</p>
        <p className="m-0">Kontak hanya terlihat oleh pasangan transaksi setelah ACCEPTED dan admin untuk moderasi; tidak dipublikasikan pada listing/request. Kedua pihak wajib mengisi WhatsApp sebelum jadwal pickup dibuat.</p>
      </aside>
    </section>
  )
}
