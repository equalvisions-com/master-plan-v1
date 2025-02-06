'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { IoPaperPlaneOutline } from "react-icons/io5";
import { cn } from '@/lib/utils';
import type { Comment } from '@/app/api/comments/route';
import { User } from '@supabase/supabase-js';

interface CommentsProps {
  url: string;
  user: User | null;
}

export function Comments({ url, user }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: "Error loading comments",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [url, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput, url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to post comment');
      }
      
      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
      setCommentInput('');
    } catch (error) {
      toast({
        title: "Error posting comment",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user === null) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Please sign in to comment
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 mt-4">
      <ScrollArea className="h-[200px]">
        <div className="space-y-[var(--content-spacing-sm)]">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-[var(--content-spacing-sm)]">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-[var(--content-spacing-xs)]">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.author}
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
          disabled={!commentInput.trim() || isLoading}
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