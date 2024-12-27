import Link from "next/link";
import { AuthButtons } from './AuthButtons';
import { User } from '@supabase/supabase-js';
import SearchBar from '../SearchBar';
import Image from "next/image";

interface MainNavProps {
  user: User | null;
}

export function MainNav({ user }: MainNavProps) {
  return (
    <nav className="flex items-center h-16">
      <div className="flex-1 flex items-center gap-6">
        <Link 
          href="/" 
          className="shrink-0"
          aria-label="Home"
        >
          <Image
            src="/favicon.ico"
            alt="Site Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
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