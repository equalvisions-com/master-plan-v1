'use client';

import { Dock, DockIcon } from '@/components/ui/dock';
import Link from 'next/link';
import { HomeIcon, SearchIcon, BookmarkIcon, UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function AppDock() {
  const pathname = usePathname();

  return (
    <Dock className="bg-background/50 border-border">
      <Link href="/" aria-label="Home">
        <DockIcon 
          className={`transition-colors ${
            pathname === '/' 
              ? 'bg-muted text-primary' 
              : 'bg-muted/50 hover:bg-muted text-foreground'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
        </DockIcon>
      </Link>
      
      <Link href="/search" aria-label="Search">
        <DockIcon 
          className={`transition-colors ${
            pathname === '/search' 
              ? 'bg-muted text-primary' 
              : 'bg-muted/50 hover:bg-muted text-foreground'
          }`}
        >
          <SearchIcon className="w-5 h-5" />
        </DockIcon>
      </Link>

      <Link href="/bookmarks" aria-label="Bookmarks">
        <DockIcon 
          className={`transition-colors ${
            pathname === '/bookmarks' 
              ? 'bg-muted text-primary' 
              : 'bg-muted/50 hover:bg-muted text-foreground'
          }`}
        >
          <BookmarkIcon className="w-5 h-5" />
        </DockIcon>
      </Link>

      <Link href="/profile" aria-label="Profile">
        <DockIcon 
          className={`transition-colors ${
            pathname === '/profile' 
              ? 'bg-muted text-primary' 
              : 'bg-muted/50 hover:bg-muted text-foreground'
          }`}
        >
          <UserIcon className="w-5 h-5" />
        </DockIcon>
      </Link>
    </Dock>
  );
} 