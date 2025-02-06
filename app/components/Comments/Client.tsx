'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IoPaperPlaneOutline } from "react-icons/io5";
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";
import type { Comment } from './types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface CommentsProps {
  url: string;
  initialComments: Comment[];
}

export function Comments({ url, initialComments }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const channel = supabase.channel('comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `url=eq.${url}`
        },
        (payload) => {
          const newComment = payload.new as Comment;
          setComments(prev => [newComment, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [url, supabase]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: commentInput.trim(),
          url 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const newComment = await response.json();
      setComments(prev => [newComment, ...prev]);
      setCommentInput('');
      
    } catch (err) {
      console.error('Error posting comment:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <ScrollArea className="h-[200px]">
        <div className="space-y-[var(--content-spacing-sm)]">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-[var(--content-spacing-sm)]">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0">
                {comment.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={comment.user.image} 
                    alt={comment.user.name || ''} 
                    className="h-8 w-8 rounded-full"
                  />
                )}
              </div>
              <div className="flex-1 space-y-[var(--content-spacing-xs)]">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.user?.name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-normal">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <form 
        onSubmit={handleCommentSubmit} 
        className="mt-[var(--content-spacing)] relative flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Write a comment..."
            className="resize-none overflow-hidden min-h-[40px] max-h-[40px] rounded-lg px-4 py-2 text-sm bg-muted focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 border-0 focus:border-0 focus-visible:border-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit(e);
              }
            }}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!commentInput.trim() || isSubmitting}
          className={cn(
            "rounded-lg h-10 w-10 shrink-0 transition-colors ring-0 focus:ring-0 focus-visible:ring-0",
            "bg-primary text-primary-foreground",
            "disabled:bg-primary disabled:opacity-50"
          )}
        >
          <IoPaperPlaneOutline className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
} 