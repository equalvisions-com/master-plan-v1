'use client'

import { memo } from 'react'
import { useBookmark } from '@/app/hooks/useBookmark'
import { Heart } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'

interface BookmarkFormProps {
  postId: string
  title: string
  userId: string
  sitemapUrl: string | null
  initialIsBookmarked: boolean
}

interface SubmitButtonProps {
  isBookmarked: boolean
  isPending: boolean
  onClick: () => void
}

const SubmitButton = memo(function SubmitButton({ 
  isBookmarked, 
  isPending,
  onClick
}: SubmitButtonProps) {
  return (
    <Button 
      type="button"
      variant="outline"
      size="icon"
      disabled={isPending}
      onClick={onClick}
      className={cn(
        "rounded-full h-9 w-9",
        isBookmarked && "text-primary hover:text-primary"
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          isBookmarked && "fill-current"
        )} 
      />
    </Button>
  )
})

export function BookmarkForm({ 
  postId, 
  title, 
  userId, 
  sitemapUrl, 
  initialIsBookmarked 
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
    initialIsBookmarked
  })

  return (
    <div className="relative">
      <SubmitButton 
        isBookmarked={isBookmarked} 
        isPending={isPending} 
        onClick={toggle}
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