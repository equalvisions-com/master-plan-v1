'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactNode } from 'react';
import type { WordPressPost } from '@/types/wordpress';

interface PostContentProps {
  children: ReactNode;
  post: WordPressPost;
}

export function PostContent({ children, post }: PostContentProps) {
  return (
    <ScrollArea className="h-[calc(100svh-var(--page-offset))]" type="always">
      {children}
    </ScrollArea>
  );
} 