'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Session } from '@supabase/supabase-js'

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ 
  children,
  initialSession 
}: { 
  children: React.ReactNode
  initialSession: Session | null 
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
} 