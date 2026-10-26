import type { AuthState } from './context.ts'
import { ApiError } from '../services/api.ts'
import type * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './context.ts'
import { getSession } from '../services/auth.ts'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', user: null, error: null })
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setAuth({ status: 'loading', user: null, error: null })
    try {
      const session = await getSession({ signal })
      if (!signal?.aborted) {
        const authenticated = session.authenticated && session.user !== null
        setAuth({ status: authenticated ? 'authenticated' : 'anonymous', user: authenticated ? session.user : null, error: null })
      }
    } catch (error) {
      if (!signal?.aborted) setAuth({ status: error instanceof ApiError && error.status === 401 ? 'anonymous' : 'error', user: null, error })
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    // Schedule outside the effect body; cleanup also cancels StrictMode's first run.
    const timeout = setTimeout(() => refresh(controller.signal), 0)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [refresh])
  return <AuthContext.Provider value={{ ...auth, refresh }}>{children}</AuthContext.Provider>
}
