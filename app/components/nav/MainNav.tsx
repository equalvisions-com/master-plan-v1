'use client';

import Link from "next/link";
import { AuthButtons } from './AuthButtons';
import { User } from '@supabase/supabase-js';

interface MainNavProps {
  user: User | null;
}

export function MainNav({ user }: MainNavProps) {
  return (
    <nav className="flex items-center justify-between h-16">
      <div className="flex items-center gap-6">
        <Link 
          href="/" 
          className="text-lg font-semibold"
        >
          Your Site Name
        </Link>
      </div>
      <AuthButtons user={user} />
    </nav>
  );
} 