'use client';

import Link from "next/link";
import type { WordPressPost } from "@/types/wordpress";

interface Props {
  post: WordPressPost;
}

export function PostLink({ post }: Props) {
  const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
  
  return (
    <Link 
      href={`/${categorySlug}/${post.slug}`}
      className="hover:text-primary"
    >
      {post.title}
    </Link>
  );
} 