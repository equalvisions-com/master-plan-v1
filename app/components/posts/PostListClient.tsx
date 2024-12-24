'use client';

import { PostCard } from "./PostCard";
import type { WordPressPost, PageInfo } from "@/types/wordpress";
import { Button } from "@/app/components/ui/button";
import { useState } from "react";
import { useQuery, gql } from "@apollo/client";

// Define the query directly in the component
const GET_POSTS = gql`
  query GetLatestPosts($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      nodes {
        ...PostFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  fragment PostFields on Post {
    id
    title
    slug
    excerpt
    featuredImage {
      node {
        sourceUrl
        altText
      }
    }
    categories {
      nodes {
        id
        name
        slug
      }
    }
  }
`;

interface PostListClientProps {
  posts: WordPressPost[];
  pageInfo?: PageInfo;
}

export function PostListClient({ posts: initialPosts, pageInfo: initialPageInfo }: PostListClientProps) {
  const [posts, setPosts] = useState<WordPressPost[]>(initialPosts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);

  const { fetchMore } = useQuery(GET_POSTS, {
    skip: true, // Skip initial query since we have initial posts
    variables: { 
      first: 6,
      after: pageInfo?.endCursor
    }
  });

  const loadMore = async () => {
    if (!pageInfo?.hasNextPage) return;
    
    setIsLoading(true);
    try {
      const { data } = await fetchMore({
        variables: {
          first: 6,
          after: pageInfo.endCursor
        }
      });

      if (data?.posts) {
        setPosts(prev => [...prev, ...data.posts.nodes]);
        setPageInfo(data.posts.pageInfo);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!posts?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {pageInfo?.hasNextPage && (
        <div className="flex justify-center mt-8">
          <Button 
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More Posts'}
          </Button>
        </div>
      )}
    </div>
  );
} 