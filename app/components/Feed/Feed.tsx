import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Loader2 } from 'lucide-react';
import { unstable_noStore } from 'next/cache';
import { headers } from 'next/headers';
import { FeedClient } from './client';
import type { FeedResponse } from './types';

// Loading component
function LoadingState() {
  return (
    <div className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] w-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

async function getFeedData(page = 1): Promise<FeedResponse> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const protocol = process?.env?.NODE_ENV === 'development' ? 'http' : 'https';
  
  const res = await fetch(`${protocol}://${host}/api/feed?page=${page}`, {
    headers: {
      'Cookie': headersList.get('cookie') || '',
    },
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch feed data');
  }
  
  return res.json();
}

export async function Feed() {
  unstable_noStore();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your feed</p>
      </div>
    );
  }

  const initialData = await getFeedData();
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';

  return (
    <Suspense fallback={<LoadingState />}>
      <FeedClient
        initialData={initialData}
        userId={userId}
      />
    </Suspense>
  );
} 