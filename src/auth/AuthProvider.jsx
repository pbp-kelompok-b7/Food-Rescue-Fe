import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './context.js'
import { getSession } from '../services/auth.js'

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: 'loading', user: null, error: null })
  const refresh = useCallback(async (signal) => {
    setAuth({ status: 'loading', user: null, error: null })
    try {
      const session = await getSession({ signal })
      if (!signal?.aborted) setAuth({ status: session.authenticated && session.user ? 'authenticated' : 'anonymous', user: session.user || null, error: null })
    } catch (error) {
      if (!signal?.aborted) setAuth({ status: error.status === 401 ? 'anonymous' : 'error', user: null, error })
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
