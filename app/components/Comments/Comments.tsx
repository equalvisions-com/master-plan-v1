'use client'

import { useState, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { IoPaperPlaneOutline } from 'react-icons/io5'
import { cn } from '@/lib/utils'
import { createComment, getComments } from '@/app/actions/comments'
import { useToast } from '@/components/ui/use-toast'

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    email: string | null
  }
}

interface CommentsProps {
  url: string
  isExpanded: boolean
  onCommentAdded?: () => void
}

export function Comments({ url, isExpanded, onCommentAdded }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const loadComments = useCallback(async () => {
    try {
      const { success, comments, error } = await getComments(url)
      if (success && comments) {
        // Convert Date objects to strings
        const formattedComments = comments.map(comment => ({
          ...comment,
          created_at: comment.created_at.toISOString(),
        }))
        setComments(formattedComments)
      } else if (error) {
        toast({
          title: 'Error loading comments',
          description: error,
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: 'Error loading comments',
        description: 'Please try again later',
        variant: 'destructive'
      })
    }
  }, [url, toast])

  useEffect(() => {
    if (isExpanded) {
      loadComments()
    }
  }, [isExpanded, loadComments])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim()) return

    setIsLoading(true)
    try {
      const { success, error } = await createComment(url, commentInput.trim())
      
      if (success) {
        setCommentInput('')
        loadComments()
        onCommentAdded?.()
        toast({
          title: 'Comment added',
          description: 'Your comment has been posted successfully'
        })
      } else if (error) {
        toast({
          title: 'Error posting comment',
          description: error,
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: 'Error posting comment',
        description: 'Please try again later',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isExpanded) return null

  return (
    <div className="border-t border-border pt-4">
      <ScrollArea className="h-[200px]">
        <div className="space-y-[var(--content-spacing-sm)]">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-[var(--content-spacing-sm)]">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-[var(--content-spacing-xs)]">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.user.email?.split('@')[0] || 'Anonymous'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(comment.created_at)}
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
                e.preventDefault()
                handleCommentSubmit(e)
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
  )
} 
