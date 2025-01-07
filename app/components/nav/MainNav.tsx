'use client';

import Link from "next/link";
import { AuthButtons } from './AuthButtons';
import { User } from '@supabase/supabase-js';
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface MainNavProps {
  user: User | null;
}

export function MainNav({ user }: MainNavProps) {
  const pathname = usePathname();

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

      {/* Center section with search link */}
      <div className="flex-1 flex justify-center">
        <Link
          href="/search"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/search" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Link>
      </div>

      {/* Right section with auth buttons */}
      <div className="flex-1 flex justify-end">
        <AuthButtons user={user} />
      </div>
    </nav>
  );
} 