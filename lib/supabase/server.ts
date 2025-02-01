import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle error if needed
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle error if needed
          }
        }
      }
    }
  )
} 