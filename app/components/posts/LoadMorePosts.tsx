'use client';

import { useQuery } from "@apollo/client";
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData, WordPressPost, CategoryData } from "@/types/wordpress";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PostCard } from './PostCard';

interface LoadMorePostsProps {
  categorySlug?: string;
  endCursor: string;
  initialPosts: WordPressPost[];
}

// Type guard to check if data is CategoryData
function isCategoryData(data: PostsData | CategoryData): data is CategoryData {
  return 'category' in data && data.category !== null;
}

export default function LoadMorePosts({ categorySlug, endCursor, initialPosts }: LoadMorePostsProps) {
  const [posts, setPosts] = useState<WordPressPost[]>(initialPosts);
  const [cursor, setCursor] = useState(endCursor);

  const { loading, fetchMore } = useQuery<PostsData | CategoryData>(
    categorySlug ? queries.categories.getWithPosts : queries.posts.getLatest,
    {
      skip: true,
      variables: { 
        slug: categorySlug,
        first: 6,
        after: cursor
      }
    }
  );

  const loadMore = async () => {
    const result = await fetchMore({
      variables: {
        after: cursor,
      }
    });

    // Use type guard to safely access data
    const newPosts = isCategoryData(result.data)
      ? result.data.category?.posts?.nodes 
      : result.data.posts?.nodes;
    
    const newCursor = isCategoryData(result.data)
      ? result.data.category?.posts?.pageInfo?.endCursor
      : result.data.posts?.pageInfo?.endCursor;
    
    if (newPosts && newCursor) {
      setPosts([...posts, ...newPosts]);
      setCursor(newCursor);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        <Button 
          onClick={loadMore}
          variant="outline"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More Posts'}
        </Button>
      </div>
    </div>
  );
} 