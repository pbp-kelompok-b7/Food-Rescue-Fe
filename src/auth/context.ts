import { createContext } from 'react'
import type { User } from '../services/types.ts'

export interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error'
  user: User | null
  error: unknown
}
export interface AuthContextValue extends AuthState {
  refresh: (signal?: AbortSignal) => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)
