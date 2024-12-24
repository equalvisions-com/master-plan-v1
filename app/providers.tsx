'use client'

import { createContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const UserContext = createContext<User | null>(null)

export function SessionProvider({ 
  children
}: { 
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Initial user fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Always verify user state with getUser() instead of using session data directly
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        router.refresh()
      } else {
        setUser(null)
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router])

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}

export { UserContext } 