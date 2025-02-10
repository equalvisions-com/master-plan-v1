'use client';

import Link from "next/link";
import Image from "next/image";
import { NavSearchBar } from "./NavSearchBar";
import { NavUser } from "@/components/nav/NavUser";
import { User } from '@supabase/supabase-js'
import { Moon, Sun } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"

interface TopNavProps {
  user: User | null;
}

export function TopNav({ user }: TopNavProps) {
  const [theme, setTheme] = useState('light')
  const pathname = usePathname()

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark')
  }

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
            <Separator orientation="vertical" className="h-6" />
            <div className="hidden md:flex items-center">
              <Link 
                href="/discover" 
                className={cn(
                  "px-6 h-[var(--header-height)] flex items-center relative text-sm font-medium text-muted-foreground w-[120px] justify-center",
                  pathname === '/discover' && "font-semibold text-foreground"
                )}
              >
                Discover
                {pathname === '/discover' && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-1 bg-primary" />
                )}
              </Link>
              <Link 
                href="/feed" 
                className={cn(
                  "px-6 h-[var(--header-height)] flex items-center relative text-sm font-medium text-muted-foreground w-[120px] justify-center",
                  pathname === '/feed' && "font-semibold text-foreground"
                )}
              >
                My Feed
                {pathname === '/feed' && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-1 bg-primary" />
                )}
              </Link>
            </div>
          </div>
          
          <div className="hidden md:block w-full max-w-[320px]">
            <NavSearchBar />
          </div>

          <div className="flex items-center gap-4 min-w-[200px] justify-end">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <NavUser user={user} />
          </div>
        </div>
      </div>
    </nav>
  );
} 