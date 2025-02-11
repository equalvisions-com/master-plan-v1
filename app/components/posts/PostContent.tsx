'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactNode } from 'react';
import type { WordPressPost } from "@/types/wordpress";
import type { SitemapEntry } from '@/app/lib/sitemap/types';

interface PostContentProps {
  children: ReactNode;
}

export function PostContent({ children }: PostContentProps) {
  return (
    <ScrollArea className="h-[calc(100svh-var(--page-offset))]" type="always">
      {children}
    </ScrollArea>
  );
}

interface ClientContentProps {
  post: WordPressPost;
  metaEntries: SitemapEntry[];
  initialLikedUrls: string[];
  initialHasMore: boolean;
  userId?: string;
  onStatsUpdate?: (stats: { totalEntries: number }) => void;
}

export function ClientContent({ 
  post, 
  metaEntries, 
  initialLikedUrls, 
  initialHasMore,
  userId,
  onStatsUpdate 
}: ClientContentProps) {
  // ... rest of the component code ...
} 