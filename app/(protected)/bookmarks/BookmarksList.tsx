'use client'

import { Card, CardHeader, CardContent } from '@/app/components/ui/card'
import Link from 'next/link'
import type { Bookmark } from '@prisma/client'
import { useBookmark } from '@/app/hooks/useBookmark'
import { Button } from '@/app/components/ui/button'

interface BookmarksListProps {
  bookmarks: Bookmark[]
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }
  return 'Just now'
}

function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const { toggle, isPending } = useBookmark({
    postId: bookmark.post_id,
    title: bookmark.title,
    userId: bookmark.user_id,
    sitemapUrl: bookmark.sitemapUrl,
    initialIsBookmarked: true
  })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <Link 
          href={bookmark.sitemapUrl}
          className="flex-1 hover:text-primary"
        >
          <h2 className="text-xl font-semibold line-clamp-2">
            {bookmark.title}
          </h2>
        </Link>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggle}
          disabled={isPending}
          className="ml-4 shrink-0"
        >
          Remove
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Bookmarked {formatDate(new Date(bookmark.created_at))}
        </p>
      </CardContent>
    </Card>
  )
}

export function BookmarksList({ bookmarks }: BookmarksListProps) {
  if (!bookmarks.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You haven&apos;t bookmarked any posts yet.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Browse Posts</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {bookmarks.map((bookmark) => (
        <BookmarkCard key={bookmark.id} bookmark={bookmark} />
      ))}
    </div>
  )
} 