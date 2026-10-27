import { useCallback, useEffect, useState } from 'react'
import { getReferenceData, type ReferenceData } from '../../services/reference.ts'

export type ReferenceState = { status: 'loading'; data: null } | { status: 'ready'; data: ReferenceData } | { status: 'error'; data: null }

export default function useReferenceData() {
  const [state, setState] = useState<ReferenceState>({ status: 'loading', data: null })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading', data: null })
    setAttempt(value => value + 1)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    getReferenceData({ signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ status: 'ready', data })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error', data: null })
    })
    return () => controller.abort()
  }, [attempt])
  return { ...state, retry }
}
