import type { WordPressPost } from '@/types/wordpress.types';

export interface PostCardProps {
  post: WordPressPost;
  variant?: 'default' | 'compact';
  priority?: boolean;
  className?: string;
} 