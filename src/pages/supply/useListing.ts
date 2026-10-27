import { useCallback, useEffect, useState } from 'react'
import { listingsApi, type Listing } from '../../services/listings.ts'

type State = { status: 'loading'; data: null; error?: never } | { status: 'ready'; data: Listing; error?: never } | { status: 'error'; data: null; error: unknown }
export default function useListing(id: string) {
  const [state, setState] = useState<State & { key: string }>({ key: id, status: 'loading', data: null })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState({ key: id, status: 'loading', data: null })
    setAttempt(value => value + 1)
  }, [id])
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => listingsApi.detail(id, { signal: controller.signal })).then(data => {
      if (!controller.signal.aborted) setState({ key: id, status: 'ready', data })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key: id, status: 'error', data: null, error })
    })
    return () => controller.abort()
  }, [id, attempt])
  return { ...(state.key === id ? state : { status: 'loading' as const, data: null }), retry }
}
