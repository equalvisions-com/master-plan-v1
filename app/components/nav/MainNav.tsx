import Link from "next/link";
import { AuthButtons } from './AuthButtons';
import { User } from '@supabase/supabase-js';
import SearchBar from '../SearchBar';

interface MainNavProps {
  user: User | null;
}

export function MainNav({ user }: MainNavProps) {
  return (
    <nav className="flex items-center h-16">
      <div className="flex-1 flex items-center gap-6">
        <Link 
          href="/" 
          className="text-lg font-semibold shrink-0"
        >
          Your Site Name
        </Link>
      </div>

      {/* Center section with search */}
      <div className="flex-1 flex justify-center max-w-2xl">
        <SearchBar />
      </div>

      {/* Right section with auth buttons */}
      <div className="flex-1 flex justify-end">
        <AuthButtons user={user} />
      </div>
    </nav>
  );
} 