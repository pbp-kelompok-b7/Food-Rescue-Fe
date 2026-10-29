import { useEffect, useState } from 'react'
import { listingsApi } from '../../services/listings.ts'
import { requestsApi } from '../../services/requests.ts'
import type { Reservation } from '../../services/reservations.ts'

// Fetches the current available quantity of a reservation's source so the
// approver can see "Jumlah tersedia saat ini" (Figma decision card). For a
// listing claim this is listing.quantity_available; for a request offer it is
// request.quantity_remaining. Only fetches when `enabled` (e.g. the viewer is
// the approver of a PENDING reservation). Returns null while loading or if the
// source cannot be read — the card then omits the line rather than guess.
export default function useSourceAvailability(reservation: Reservation | null, enabled: boolean) {
  const listingId = reservation?.listing_id ?? null
  const requestId = reservation?.request_id ?? null
  // Key the result by source so a changed source reads as null without a
  // synchronous setState in the effect.
  const key = enabled ? `${listingId ?? ''}:${requestId ?? ''}` : ''
  const [state, setState] = useState<{ key: string; value: string }>({ key: '\0', value: '' })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const load = listingId
      ? listingsApi.detail(listingId, { signal: controller.signal }).then(data => data.quantity_available)
      : requestId
        ? requestsApi.detail(requestId, { signal: controller.signal }).then(data => data.quantity_remaining)
        : null
    if (!load) return
    load.then(value => { if (!controller.signal.aborted) setState({ key, value }) }).catch(() => { /* leave unresolved; the line is omitted */ })
    return () => controller.abort()
  }, [enabled, key, listingId, requestId])
  return state.key === key && key ? state.value : null
}
