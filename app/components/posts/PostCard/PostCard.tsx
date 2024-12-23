import Link from "next/link";
import type { PostCardProps } from "@/types/components.types";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";

export function PostCard({ post }: PostCardProps) {
  const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
  
  return (
    <Link href={`/${categorySlug}/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader>
          <h2 className="text-xl font-bold line-clamp-2">{post.title}</h2>
        </CardHeader>
        <CardContent>
          <div 
            className="text-muted-foreground line-clamp-3"
            dangerouslySetInnerHTML={{ __html: post.excerpt || '' }}
          />
        </CardContent>
      </Card>
    </Link>
  );
} 