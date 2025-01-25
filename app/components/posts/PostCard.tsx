import Link from "next/link";
import Image from "next/image";
import { Card } from "@/app/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/app/components/ui/button";
import { MessageCircle, Heart, Share } from "lucide-react";
import type { WordPressPost } from "@/types/wordpress";
import { memo } from 'react';

interface Props {
  post: WordPressPost;
}

export const PostCard = memo(function PostCard({ post }: Props) {
  const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
  
  return (
    <Link href={`/${categorySlug}/${post.slug}`}>
      <Card className="h-full hover:shadow-sm transition-shadow">
        <div className="p-4">
          <div className="flex gap-4">
            {post.featuredImage?.node && (
              <div className="w-24 aspect-square flex-shrink-0">
                <AspectRatio ratio={1}>
                  <Image
                    src={post.featuredImage.node.sourceUrl}
                    alt={post.featuredImage.node.altText || post.title}
                    fill
                    quality={100}
                    className="object-cover rounded-sm"
                    sizes="96px"
                  />
                </AspectRatio>
              </div>
            )}
            <div className="flex-1 flex flex-col justify-between h-24">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold line-clamp-2 leading-tight">{post.title}</h2>
                <Button 
                  size="sm" 
                  variant="default" 
                  className="rounded-full text-xs py-1 px-2 font-bold h-auto -mt-1"
                >
                  Subscribe
                </Button>
              </div>

              <div 
                className="text-muted-foreground line-clamp-2 text-sm leading-snug"
                dangerouslySetInnerHTML={{ __html: post.excerpt }}
              />
              
              <div className="flex gap-6 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span className="text-xs">24</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">3</span>
                </div>
                <div className="flex items-center">
                  <Share className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}); 