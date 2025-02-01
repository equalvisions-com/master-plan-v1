'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactNode } from 'react';
import type { WordPressPost } from '@/types/wordpress';

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