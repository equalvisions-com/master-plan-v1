import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, { ...cookieOptions }: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...cookieOptions })
          } catch (err) {
            logger.error('Error setting cookie:', err)
          }
        },
        remove(name: string, { ...cookieOptions }: CookieOptions) {
          try {
            cookieStore.delete({ name, ...cookieOptions })
          } catch (err) {
            logger.error('Error removing cookie:', err)
          }
        },
      },
    }
  )
} 