'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { BookmarkLoading } from './loading'

const BookmarkButton = dynamic(
  () => import('./index').then(mod => mod.BookmarkButton),
  {
    loading: () => <BookmarkLoading />,
    ssr: false
  }
)

interface ClientBookmarkButtonProps {
  postId: string
  title: string
  sitemapUrl: string | null
}

export function ClientBookmarkButton(props: ClientBookmarkButtonProps) {
  return (
    <Suspense fallback={<BookmarkLoading />}>
      <BookmarkButton {...props} />
    </Suspense>
  )
} 