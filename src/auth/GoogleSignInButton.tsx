import { useEffect, useEffectEvent, useRef, useState } from 'react'
import Button from '../components/ui/Button.tsx'
import { connectGoogleIdentity, loadGoogleIdentity } from './googleIdentity.ts'

export default function GoogleSignInButton({ disabled, onCredential }: { disabled: boolean; onCredential: (credential: string) => Promise<void> }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const acceptCredential = useEffectEvent((credential: string) => {
    if (!disabled && credential) void onCredential(credential)
  })

  useEffect(() => {
    if (!clientId) return
    let active = true
    let disconnect: (() => void) | undefined
    let observer: ResizeObserver | undefined
    const element = host.current!
    loadGoogleIdentity().then(api => {
      if (!active) return
      disconnect = connectGoogleIdentity(api, clientId, response => acceptCredential(response.credential))
      let lastWidth = 0
      const render = () => {
        const width = Math.max(120, Math.min(400, Math.round(element.getBoundingClientRect().width)))
        if (width === lastWidth) return
        lastWidth = width
        element.replaceChildren()
        api.renderButton(element, {
          type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
          shape: 'rectangular', logo_alignment: 'center', locale: 'id', width,
        })
      }
      render()
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(render)
        observer.observe(element)
      }
      setStatus('ready')
    }).catch(() => {
      if (active) {
        setStatus('error')
        setMessage('Google Sign-In gagal dimuat. Periksa koneksi, lalu coba lagi.')
      }
    })
    return () => {
      active = false
      disconnect?.()
      observer?.disconnect()
      element.replaceChildren()
    }
  }, [clientId, attempt])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-12 w-full items-center" aria-busy={Boolean(clientId) && status === 'loading'}>
        <div ref={host} className={`absolute inset-0 flex w-full items-center ${status !== 'ready' ? 'invisible' : ''}`} aria-hidden={status !== 'ready'} inert={disabled || status !== 'ready'} aria-label="Lanjutkan dengan Google" />
        {status !== 'ready' && <Button variant="secondary" className="h-12 w-full gap-2 shadow-none" disabled={disabled || (Boolean(clientId) && status === 'loading')} onClick={() => {
          if (!clientId) setMessage('Google Sign-In belum dikonfigurasi. Gunakan email dan kata sandi.')
          else { setMessage(null); setStatus('loading'); setAttempt(value => value + 1) }
        }}>
          <img src="/assets/figma/auth-google-g.png" alt="" width={18} height={18} className="size-4.5 object-contain" />
          Lanjutkan dengan Google
        </Button>}
      </div>
      {message && <p role="status" className="m-0 text-sm text-muted">{message}</p>}
    </div>
  )
}
