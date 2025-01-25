import { User } from '@supabase/supabase-js'
import type { WordPressPost } from "@/types/wordpress"

export interface ProfileSidebarProps {
  user: User | null
  post: WordPressPost
}

export interface ActionButtonsProps {
  user: User | null
  post: WordPressPost
} 