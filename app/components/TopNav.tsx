'use client';

import Link from "next/link";
import Image from "next/image";
import { NavSearchBar } from "./NavSearchBar";
import { NavUser } from "@/components/nav/NavUser";
import { User } from '@supabase/supabase-js'

interface TopNavProps {
  user: User | null;
}

export function TopNav({ user }: TopNavProps) {
  return (
    <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-[1280px] px-[var(--page-padding)]">
        <div className="flex h-[var(--header-height)] items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-[200px]">
            <Link href="/" className="relative w-24 h-8">
              <Image
                src="/next.svg"
                alt="Next.js Logo"
                fill
                className="object-contain"
                priority
              />
            </Link>
          </div>
          
          <div className="hidden md:block w-full max-w-[320px]">
            <NavSearchBar />
          </div>

          <div className="flex items-center gap-4 min-w-[200px] justify-end">
            <NavUser user={user} />
          </div>
        </div>
      </div>
    </nav>
  );
} 