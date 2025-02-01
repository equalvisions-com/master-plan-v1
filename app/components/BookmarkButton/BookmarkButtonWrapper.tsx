'use client';

import { BookmarkButton } from './index';
import type { User } from '@supabase/supabase-js';

interface BookmarkButtonWrapperProps {
  postId: string;
  title: string;
  sitemapUrl: string | null;
  user: User | null;
  'aria-label'?: string;
}

export function BookmarkButtonWrapper(props: BookmarkButtonWrapperProps) {
  return <BookmarkButton {...props} />;
} 