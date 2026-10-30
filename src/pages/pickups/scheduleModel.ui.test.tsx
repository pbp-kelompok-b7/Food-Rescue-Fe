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

it.each(['2026-11-01T00:00', '2026-11-01T06:59', '2026-11-01T07:00', '2026-11-01T23:59', '2027-01-01T00:15', '2028-03-01T00:01', '2028-02-29T06:30'])('accepts a valid Jakarta schedule across UTC date boundaries: %s', value => {
  expect(jakartaInputToTimestamp(value)).toBe(`${value}:00+07:00`)
  expect(validatePickupSchedule(value, '', '2099-01-01T12:00:00+07:00', Date.parse('2026-10-30T12:00:00+07:00'))).toEqual({})
})
it.each(['2026-02-29T06:30', '2026-11-31T00:00', '2026-13-01T00:00', '2026-11-01T24:00', '2026-11-01T06:60'])('rejects invalid Jakarta calendar input: %s', value => {
  expect(jakartaInputToTimestamp(value)).toBeNull()
})
