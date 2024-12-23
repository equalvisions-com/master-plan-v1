'use client'

import { createContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ 
  children,
  initialSession 
}: { 
  children: React.ReactNode
  initialSession: Session | null 
}) {
  const [session] = useState<Session | null>(initialSession)
  const supabase = createClient()
  const router = useRouter()
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== accessToken) {
        router.refresh()
      }
      setAccessToken(session?.access_token ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router, accessToken])

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
} 