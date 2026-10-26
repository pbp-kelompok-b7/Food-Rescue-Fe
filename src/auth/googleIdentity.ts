export interface GoogleCredentialResponse {
  credential: string
}

export interface GoogleIdentity {
  initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; auto_select: boolean; ux_mode: 'popup' }) => void
  renderButton: (element: HTMLElement, options: { type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; logo_alignment: 'center'; width: number; locale: 'id' }) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

let loading: Promise<GoogleIdentity> | undefined
let initializedClientId: string | undefined
let activeCallback: ((response: GoogleCredentialResponse) => void) | undefined

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id)
  if (loading) return loading
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client?hl=id'
    script.async = true
    script.defer = true
    const fail = () => {
      clearTimeout(timeout)
      script.remove()
      reject(new Error('Google Sign-In gagal dimuat. Periksa koneksi dan coba lagi.'))
    }
    const timeout = setTimeout(fail, 15000)
    script.onerror = fail
    script.onload = () => {
      clearTimeout(timeout)
      if (window.google?.accounts.id) resolve(window.google.accounts.id)
      else fail()
    }
    document.head.append(script)
  }).catch(error => {
    loading = undefined
    throw error
  })
  return loading
}

export function connectGoogleIdentity(api: GoogleIdentity, clientId: string, callback: (response: GoogleCredentialResponse) => void) {
  if (initializedClientId !== clientId) {
    api.initialize({ client_id: clientId, callback: response => activeCallback?.(response), auto_select: false, ux_mode: 'popup' })
    initializedClientId = clientId
  }
  activeCallback = callback
  return () => { if (activeCallback === callback) activeCallback = undefined }
}

export function disableGoogleAutoSelect() {
  if (typeof window !== 'undefined') window.google?.accounts.id.disableAutoSelect()
}
