import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import type { WordPressPost } from "@/types/wordpress";

interface Props {
  post: WordPressPost;
}

export function PostCard({ post }: Props) {
  // Get the first category or default to 'uncategorized'
  const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
  
  return (
    <Link href={`/${categorySlug}/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        {post.featuredImage?.node && (
          <div className="relative aspect-video">
            <Image
              src={post.featuredImage.node.sourceUrl}
              alt={post.featuredImage.node.altText || post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader>
          <h2 className="text-xl font-bold line-clamp-2">{post.title}</h2>
        </CardHeader>
        <CardContent>
          <div 
            className="text-muted-foreground line-clamp-3"
            dangerouslySetInnerHTML={{ __html: post.excerpt }}
          />
        </CardContent>
      </Card>
    </Link>
  );
} 