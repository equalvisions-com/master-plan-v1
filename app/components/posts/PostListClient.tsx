'use client';

import { PostCard } from "./PostCard";
import type { WordPressPost, PageInfo } from "@/types/wordpress";
import Link from 'next/link';

interface PostListClientProps {
  posts: WordPressPost[];
  pageInfo: PageInfo & { currentPage: number };
  perPage: number;
  categorySlug?: string;
  currentPage: number;
}

export function PostListClient({
  posts,
  pageInfo,
  categorySlug,
  currentPage
}: PostListClientProps) {
  const createPageUrl = (pageNum: number) => {
    const baseUrl = categorySlug ? `/${categorySlug}` : '/';
    return pageNum === 1 ? baseUrl : `${baseUrl}?page=${pageNum}`;
  };

  return (
    <div className="space-y-8">
      {/* Posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-8">
        {currentPage > 1 && (
          <Link 
            href={createPageUrl(currentPage - 1)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Previous
          </Link>
        )}
        
        <span className="text-sm text-muted-foreground">
          Page {currentPage}
        </span>

        {pageInfo.hasNextPage && (
          <Link 
            href={createPageUrl(currentPage + 1)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
} 