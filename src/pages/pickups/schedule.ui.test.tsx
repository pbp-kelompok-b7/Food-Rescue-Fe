import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import AuthProvider from '../../auth/AuthProvider.tsx'
import { setCsrfToken } from '../../services/api.ts'
import SchedulePickup from './SchedulePickup.tsx'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root
let container: HTMLDivElement
let reservation: Record<string, unknown>
let profile: Record<string, unknown>
let writeCode: string | null
let requests: {
  url: URL
  method: string
  body: Record<string, unknown> | null
  csrf: string | null
}[]

const acceptedSnapshot = {
  title: 'Snapshot Rice Box',
  location: { label: 'Lokasi accepted', area: 'Depok', latitude: -6.3, longitude: 106.8 },
  resource_deadline: '2099-10-01T11:00:00Z',
}

function ok(data: unknown) {
  return Response.json({ success: true, data })
}

function failed(code: string) {
  return Response.json(
    {
      success: false,
      message: 'Conflict',
      errors: [{ field: null, code, message: code }],
    },
    { status: 409 },
  )
}

async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 15))
  })
}

async function mount(
  userId = 7,
  ownPhone: string | null = '+6281234567890',
  otherPhone: string | null = '+6281234567891',
) {
  reservation = {
    id: 41,
    status: 'ACCEPTED',
    provider: { id: 7 },
    receiver: { id: 8 },
    accepted_snapshot: structuredClone(acceptedSnapshot),
    // Deliberately different terms emulate a source edited after acceptance.
    terms: {
      ...structuredClone(acceptedSnapshot),
      title: 'Changed live source',
      location: { ...acceptedSnapshot.location, label: 'Lokasi live' },
      resource_deadline: '2027-01-01T00:00:00Z',
    },
    pickup: null,
    counterparty_contact: {
      user_id: 8,
      whatsapp_number: otherPhone,
      whatsapp_url: null,
    },
  }
  profile = { id: userId, display_name: 'Provider', whatsapp_number: ownPhone }
  writeCode = null
  requests = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, options: RequestInit & { headers: Headers }) => {
      const url = new URL(input, 'http://localhost')
      const method = options.method || 'GET'
      const body = options.body ? JSON.parse(String(options.body)) : null
      requests.push({ url, method, body, csrf: options.headers.get('X-CSRFToken') })

      if (url.pathname.endsWith('/auth/session/')) {
        return ok({ authenticated: true, user: { id: userId, is_active: true } })
      }
      if (url.pathname.endsWith('/auth/csrf/')) return ok({ csrf_token: 'pickup-csrf' })
      if (url.pathname.endsWith('/users/me/')) return ok(profile)
      if (url.pathname.endsWith('/reservations/41/') && method === 'GET') {
        return ok(structuredClone(reservation))
      }
      if (url.pathname.endsWith('/reservations/41/pickup/') && method === 'POST') {
        if (writeCode) {
          if (writeCode === 'pickup_exists') reservation.pickup = { id: 91 }
          return failed(writeCode)
        }
        return ok({
          id: 91,
          reservation_id: 41,
          ...body,
          location: acceptedSnapshot.location,
          status: 'SCHEDULED',
        })
      }

      throw new Error(`Unexpected request ${method} ${url.pathname}`)
    }),
  )

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        ),
        children: [
          { path: '/reservations/:id/pickup', element: <SchedulePickup /> },
          { path: '/pickups/:id', element: <p>Detail pickup terbuka</p> },
        ],
      },
    ],
    { initialEntries: ['/reservations/41/pickup'] },
  )

  await act(async () => root.render(<RouterProvider router={router} />))
  await settle()
}

async function input(selector: string, value: string) {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  await act(async () => {
    const prototype =
      element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function setPickupDateTime(date: string, time: string) {
  await input('[name="pickup_date"]', date)
  await input('[name="pickup_time"]', time)
}

async function submit() {
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
  })
}

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  vi.unstubAllGlobals()
  setCsrfToken(null)
})

it('posts a valid schedule using the accepted snapshot and opens the created pickup', async () => {
  await mount()
  expect(container.textContent).toContain('Lokasi accepted')
  expect(container.textContent).not.toContain('Lokasi live')
  await setPickupDateTime('2099-10-01', '17:00')
  await input('[name="instructions"]', 'Temui petugas')
  await submit()

  const request = requests.find(item => item.method === 'POST')
  expect(request?.body).toEqual({
    scheduled_at: '2099-10-01T17:00:00+07:00',
    instructions: 'Temui petugas',
  })
  expect(request?.csrf).toBe('pickup-csrf')
  await settle()
  expect(container.textContent).toContain('Detail pickup terbuka')
})

it('blocks past or deadline-equal schedules in the form', async () => {
  await mount()
  await setPickupDateTime('2020-10-01', '18:00')
  await submit()
  expect(requests.some(item => item.method === 'POST')).toBe(false)
  expect(container.textContent).toContain('masa depan')

  await setPickupDateTime('2099-10-01', '18:00')
  await submit()
  expect(requests.some(item => item.method === 'POST')).toBe(false)
  expect(container.textContent).toContain('sebelum batas waktu resource')
})

it('explains missing contacts and blocks users who are not the provider', async () => {
  await mount(7, null, null)
  expect(container.textContent).toContain('perbarui di profilmu')
  expect(container.textContent).toContain('receiver memperbarui kontak di profilnya')
  expect(container.querySelector('form')).toBeNull()

  await act(async () => root.unmount())
  await mount(99)
  expect(container.textContent).toContain('Hanya provider pada reservation ini')
  expect(container.querySelector('form')).toBeNull()
})

it('refreshes reservation state after the backend reports a duplicate pickup', async () => {
  await mount()
  writeCode = 'pickup_exists'
  await setPickupDateTime('2099-10-01', '17:00')
  await submit()
  await settle()
  expect(container.textContent).toContain('Pickup sudah dijadwalkan')
  expect(container.querySelector('a[href="/pickups/91"]')).not.toBeNull()
})
