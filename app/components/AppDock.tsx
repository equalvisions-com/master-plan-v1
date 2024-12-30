'use client';

import { Dock, DockIcon } from '@/components/ui/dock';
import Link from 'next/link';
import { HomeIcon, SearchIcon, BookmarkIcon, UserIcon } from 'lucide-react';

export function AppDock() {
  return (
    <Dock className="bg-background/50 border-border">
      <Link href="/" aria-label="Home">
        <DockIcon className="bg-muted/50 hover:bg-muted transition-colors">
          <HomeIcon className="w-5 h-5 text-foreground" />
        </DockIcon>
      </Link>
      
      <Link href="/search" aria-label="Search">
        <DockIcon className="bg-muted/50 hover:bg-muted transition-colors">
          <SearchIcon className="w-5 h-5 text-foreground" />
        </DockIcon>
      </Link>

      <Link href="/bookmarks" aria-label="Bookmarks">
        <DockIcon className="bg-muted/50 hover:bg-muted transition-colors">
          <BookmarkIcon className="w-5 h-5 text-foreground" />
        </DockIcon>
      </Link>

      <Link href="/profile" aria-label="Profile">
        <DockIcon className="bg-muted/50 hover:bg-muted transition-colors">
          <UserIcon className="w-5 h-5 text-foreground" />
        </DockIcon>
      </Link>
    </Dock>
  );
} 