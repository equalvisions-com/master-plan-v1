import Image from "next/image";
import Link from "next/link";
import type { PostCardProps } from "@/types/components.types";
import { Card } from "@/components/ui/card";
import { ReactElement } from 'react';

export function PostCard({ post }: PostCardProps): ReactElement {
  const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
  
  return (
    <Link href={`/${categorySlug}/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div role="article">
          {/* ... */}
        </div>
      </Card>
    </Link>
  );
} 