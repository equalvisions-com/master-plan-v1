'use client'

import { memo, useState } from 'react'
import { useBookmark } from '@/app/hooks/useBookmark'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'

interface BookmarkFormProps {
  postId: string
  title: string
  userId: string
  sitemapUrl: string | null
  initialIsBookmarked: boolean
  featuredImage?: string | null
}

interface SubmitButtonProps {
  isBookmarked: boolean
  isPending: boolean
  isBookmarkCooldown: boolean
  onClick: () => void
}

const SubmitButton = memo(function SubmitButton({ 
  isBookmarked, 
  isPending,
  isBookmarkCooldown,
  onClick
}: SubmitButtonProps) {
  return (
    <Button 
      type="button"
      variant={isBookmarked ? "outline" : "default"}
      size="sm"
      onClick={onClick}
      disabled={isPending || isBookmarkCooldown}
      className={cn(
        "rounded-full disabled:opacity-100",
        isBookmarked && "bg-background hover:bg-accent"
      )}
    >
      {isBookmarked ? "Following" : "Follow"}
    </Button>
  )
})

export function BookmarkForm({ 
  postId, 
  title, 
  userId, 
  sitemapUrl, 
  initialIsBookmarked,
  featuredImage
}: BookmarkFormProps) {
  const { 
    isBookmarked, 
    toggle, 
    error, 
    isPending 
  } = useBookmark({
    postId,
    title,
    userId,
    sitemapUrl,
    initialIsBookmarked,
    featuredImage
  })

  const [isBookmarkCooldown, setIsBookmarkCooldown] = useState(false)

  const handleToggle = () => {
    if (isPending || isBookmarkCooldown) return;

    toggle();

    // Set a cooldown period of 1 second
    setIsBookmarkCooldown(true);
    setTimeout(() => {
      setIsBookmarkCooldown(false);
    }, 1000);
  };

  return (
    <div className="relative">
      <SubmitButton 
        isBookmarked={isBookmarked} 
        isPending={isPending}
        isBookmarkCooldown={isBookmarkCooldown}
        onClick={handleToggle}
      />
      {error && error.length > 0 && (
        <div 
          className="absolute top-full mt-2 text-sm text-red-500 bg-red-50 px-3 py-1 rounded" 
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  )
} 