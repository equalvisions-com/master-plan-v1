import type { WordPressPost } from './wordpress';

export interface LoadMorePostsProps {
  categorySlug?: string;
  endCursor: string;
  initialPosts: WordPressPost[];
}

export interface PostCardProps {
  post: WordPressPost;
  variant?: 'default' | 'compact';
  className?: string;
} 