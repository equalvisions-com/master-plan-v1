import { unstable_noStore } from 'next/cache';
import { Comments } from './Client';
import { redis } from '@/lib/redis';
import { createClient } from '@/lib/supabase/server';

interface CommentsServerProps {
  url: string;
}

export async function CommentsServer({ url }: CommentsServerProps) {
  unstable_noStore();
  
  // We don't need user here since we're just fetching comments
  await createClient();

  // Get comments from Redis
  const commentsData = await redis.lrange(`comments:${url}`, 0, -1);
  const comments = commentsData
    .map(comment => JSON.parse(comment))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Comments 
      url={url} 
      initialComments={comments}
    />
  );
} 