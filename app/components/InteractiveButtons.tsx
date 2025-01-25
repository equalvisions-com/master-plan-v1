'use client';

import { User } from '@supabase/supabase-js';
import { Button } from "@/app/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { BookmarkButton } from '@/app/components/BookmarkButton';
import type { WordPressPost } from "@/types/wordpress";

interface InteractiveButtonsProps {
  user: User | null;
  post: WordPressPost;
}

export function InteractiveButtons({ user, post }: InteractiveButtonsProps) {
  const handleSubscribe = () => {
    // TODO: Implement newsletter subscription
    console.log('Subscribe clicked');
  };

  return (
    <div className="flex gap-2 mt-2">
      <Button 
        className="hover:bg-primary/90 transition-colors w-full sm:w-auto rounded-full" 
        size="sm" 
        onClick={handleSubscribe}
      >
        Subscribe
      </Button>
      <BookmarkButton
        postId={post.id}
        title={post.title}
        sitemapUrl={post.sitemapUrl?.sitemapurl ?? null}
        user={user}
      />
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full h-9 w-9"
        onClick={() => console.log('Menu clicked')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
} 