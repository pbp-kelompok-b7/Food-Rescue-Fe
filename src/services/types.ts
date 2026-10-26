export type ResourceId = number | string
export type QueryParams = Record<string, string>
export type ApiPayload = Record<string, unknown>

export interface User {
  id: number
  username?: string
  display_name?: string
  whatsapp_number?: string | null
  name?: string
  email?: string
  is_admin?: boolean
  is_staff?: boolean
  is_active?: boolean
}

export interface Session {
  authenticated: boolean
  user: User | null
}
