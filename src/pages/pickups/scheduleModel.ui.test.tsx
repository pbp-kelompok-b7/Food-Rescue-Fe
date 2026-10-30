import { expect, it } from 'vitest'
import { ApiError } from '../../services/api.ts'
import { jakartaInputToTimestamp, pickupScheduleError, validatePickupSchedule } from './scheduleModel.ts'

const now = Date.parse('2026-10-29T02:00:00Z') // 09.00 WIB
const deadline = '2026-10-29T11:00:00Z' // 18.00 WIB

it('serializes a Jakarta wall time as RFC3339 with the +07:00 offset', () => {
  expect(jakartaInputToTimestamp('2026-10-29T10:30')).toBe('2026-10-29T10:30:00+07:00')
  expect(jakartaInputToTimestamp('2026-02-30T10:30')).toBeNull()
})

it('accepts a future schedule before the accepted resource deadline', () => {
  expect(validatePickupSchedule('2026-10-29T10:00', 'Temui petugas', deadline, now)).toEqual({})
})

it('rejects schedules that are past, at/after deadline, or have overlong instructions', () => {
  expect(validatePickupSchedule('2026-10-29T08:59', '', deadline, now).scheduled_at).toMatch(/masa depan/)
  expect(validatePickupSchedule('2026-10-29T18:00', '', deadline, now).scheduled_at).toMatch(/sebelum batas/)
  expect(validatePickupSchedule('2026-10-29T10:00', 'x'.repeat(2001), deadline, now).instructions).toMatch(/2.000/)
})

it('maps duplicate/contact conflicts to actionable explanations', () => {
  const duplicate = new ApiError('Conflict', 409, { errors: [{ field: null, code: 'pickup_exists', message: 'exists' }] })
  const contact = new ApiError('Conflict', 409, { errors: [{ field: null, code: 'contact_required', message: 'contact' }] })
  expect(pickupScheduleError(duplicate)).toContain('sudah dijadwalkan')
  expect(pickupScheduleError(contact)).toContain('Kedua pihak')
})
