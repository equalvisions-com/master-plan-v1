'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { toggleMetaLike } from '@/app/actions/meta-like'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface LikeButtonProps {
  metaUrl: string
  initialIsLiked: boolean
  onLikeChange?: (isLiked: boolean) => void
}

export function LikeButton({ 
  metaUrl, 
  initialIsLiked,
  onLikeChange 
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleClick = async () => {
    if (isPending) return

    const prevState = isLiked
    setIsPending(true)
    
    try {
      // Optimistic update
      setIsLiked(!isLiked)
      onLikeChange?.(!isLiked)

      const { success, liked, error } = await toggleMetaLike(metaUrl)

      if (!success || typeof liked !== 'boolean') {
        throw new Error(error || 'Failed to toggle like')
      }

      // Update to real state if different from optimistic
      if (liked !== !prevState) {
        setIsLiked(liked)
        onLikeChange?.(liked)
      }
      router.refresh()
    } catch (error) {
      // Revert on error
      setIsLiked(prevState)
      onLikeChange?.(prevState)
      
      toast({
        title: "Error updating like",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "rounded-full h-9 w-9",
        isLiked && "text-primary hover:text-primary",
        isPending && "pointer-events-none"
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          isLiked && "fill-current"
        )}
      />
    </Button>
  )
} 