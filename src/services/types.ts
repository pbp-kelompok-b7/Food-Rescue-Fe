export type ResourceId = number | string
export type QueryParams = Record<string, string>
export type ApiPayload = Record<string, unknown>

export interface User {
  id: number
  username: string
  name?: string
  email?: string
  is_admin?: boolean
  is_staff?: boolean
}

export interface Session {
  authenticated: boolean
  user: User | null
}
