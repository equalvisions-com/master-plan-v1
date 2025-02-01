// Ensure proper server/client separation

import type { User } from '@supabase/supabase-js';
import type { WordPressPost } from '@/types/wordpress';
import { ProfileSidebar } from './ProfileSidebar';

interface ProfileSidebarWrapperProps {
  user: User | null;
  post: WordPressPost;
  relatedPosts: WordPressPost[];
}

export function ProfileSidebarWrapper({ user, post, relatedPosts }: ProfileSidebarWrapperProps) {
  return <ProfileSidebar user={user} post={post} relatedPosts={relatedPosts} />;
} 