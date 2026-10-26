import type { AuthState } from './context.ts'
import { ApiError } from '../services/api.ts'
import type * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext } from './context.ts'
import { getSession } from '../services/auth.ts'
import { setCsrfToken } from '../services/api.ts'
import { disableGoogleAutoSelect } from './googleIdentity.ts'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', user: null, error: null })
  const revision = useRef(0)
  const clearSession = useCallback(() => {
    disableGoogleAutoSelect()
    revision.current += 1
    setCsrfToken(null)
    setAuth({ status: 'anonymous', user: null, error: null })
  }, [])
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const current = ++revision.current
    setAuth({ status: 'loading', user: null, error: null })
    let next: AuthState
    try {
      const session = await getSession({ signal })
      if (typeof session?.authenticated !== 'boolean' || (session.authenticated && !session.user)) {
        throw new Error('Respons sesi tidak valid.')
      }
      const authenticated = session.authenticated && session.user !== null && session.user.is_active !== false
      next = { status: authenticated ? 'authenticated' : 'anonymous', user: authenticated ? session.user : null, error: null }
    } catch (error) {
      next = { status: error instanceof ApiError && error.status === 401 ? 'anonymous' : 'error', user: null, error }
    }
    if (!signal?.aborted && current === revision.current) setAuth(next)
    return next
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    // Schedule outside the effect body; cleanup also cancels StrictMode's first run.
    const timeout = setTimeout(() => refresh(controller.signal), 0)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [refresh])
  return <AuthContext.Provider value={{ ...auth, refresh, clearSession }}>{children}</AuthContext.Provider>
}
