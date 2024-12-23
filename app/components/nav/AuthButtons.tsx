import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { SignOutButton } from './SignOutButton'

export function AuthButtons({ user }: { user: User | null }) {
  return user ? (
    <div className="flex gap-4">
      <Button variant="ghost" asChild>
        <Link href="/profile">Profile</Link>
      </Button>
      <SignOutButton />
    </div>
  ) : (
    <div className="flex gap-4">
      <Button variant="ghost" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  )
} 