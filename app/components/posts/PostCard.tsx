import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { WordPressPost } from "@/types/wordpress";

interface Props {
  post: WordPressPost;
}

export function PostCard({ post }: Props) {
  const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
  
  return (
    <Link href={`/${categorySlug}/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow">
        <div className="p-4 space-y-4">
          <div className="flex gap-4 items-start">
            {post.featuredImage?.node && (
              <div className="w-[60px] flex-shrink-0">
                <AspectRatio ratio={1}>
                  <Image
                    src={post.featuredImage.node.sourceUrl}
                    alt={post.featuredImage.node.altText || post.title}
                    fill
                    quality={100}
                    className="object-cover rounded-sm"
                    sizes="60px"
                  />
                </AspectRatio>
              </div>
            )}
            <h2 className="flex-1 text-xl font-bold line-clamp-2">{post.title}</h2>
          </div>
          
          <div 
            className="text-muted-foreground line-clamp-3"
            dangerouslySetInnerHTML={{ __html: post.excerpt }}
          />
        </div>
      </Card>
    </Link>
  );
} 