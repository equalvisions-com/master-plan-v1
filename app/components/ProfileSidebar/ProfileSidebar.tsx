import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import { Newspaper, Users, Globe } from "lucide-react";
import { AiOutlineX } from "react-icons/ai";
import Link from "next/link";
import type { WordPressPost } from "@/types/wordpress";
import { BookmarkButton } from '@/app/components/BookmarkButton';
import { NewsletterImage } from './NewsletterImage';
import { Badge } from "@/components/ui/badge";
import type { SitemapUrlField } from '@/app/types/wordpress';
import { PlatformIcon } from '@/app/lib/utils/platformMap';

type PostWithPlatform = WordPressPost;

interface ProfileSidebarProps {
  user: User | null;
  post: PostWithPlatform;
  relatedPosts?: WordPressPost[];
  totalPosts?: number;
  followerCount?: number;
}

export function ProfileSidebar({ user, post, relatedPosts = [], totalPosts = 0, followerCount = 0 }: ProfileSidebarProps) {
  const newsletterData = {
    name: post.title,
    title: "Newsletter",
    description: post.excerpt?.replace(/(<([^>]+)>)/gi, "").trim() || "",
    image: post.featuredImage?.node?.sourceUrl || "/newsletter-logo.png",
  };

  // Only create sitemapUrlField if we have a valid sitemapurl
  const sitemapUrlField: SitemapUrlField | undefined = post.sitemapUrl?.sitemapurl 
    ? {
        fieldGroupName: 'SitemapUrl',
        sitemapurl: post.sitemapUrl.sitemapurl
      }
    : undefined;

  return (
    <aside className="w-full min-w-0 hidden lg:block">
      <ScrollArea 
        className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] [&_[data-radix-scroll-area-viewport]>div]:!block" 
        type="always"
      >
        <div className="flex flex-col gap-6 min-w-0">
          {/* Newsletter Profile Card */}
          <Card className="min-w-0">
            <CardHeader className="p-4">
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <NewsletterImage
                    src={newsletterData.image}
                    alt={post.featuredImage?.node?.altText || newsletterData.name}
                  />
                </div>
                <div className="text-left pt-2 flex-1 min-w-0">
                  <CardTitle className="text-xl">{newsletterData.name}</CardTitle>
                  <div className="flex gap-3 mt-2">
                    <Button 
                      className="hover:bg-primary/90 transition-colors rounded-md font-semibold" 
                      size="sm"
                    >
                      Subscribe
                    </Button>
                    {post.id && (
                      <BookmarkButton
                        postId={post.id}
                        title={post.title}
                        sitemapUrl={sitemapUrlField}
                        user={user}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground leading-normal mb-4">
                {newsletterData.description}
              </p>
              {/* Stats Section */}
              <div className="flex justify-between">
                <div className="text-center">
                  <p className="text-base font-semibold mb-1">{totalPosts}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Newspaper className="h-3.5 w-3.5" />
                    <p className="text-sm font-semibold">Posts</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold mb-1">{followerCount}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <p className="text-sm font-semibold">Followers</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold mb-1">50k</p>
                  <div className="flex items-center justify-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    <p className="text-sm font-semibold">Visitors</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Info Card */}
          <Card className="min-w-0">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Author</span>
                  {post.author?.authorname ? (
                    post.author.authorurl ? (
                      <Link 
                        href={post.author.authorurl}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors border-b border-dotted border-muted-foreground hover:border-primary pb-0.5"
                      >
                        {post.author.authorname}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {post.author.authorname}
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Platform</span>
                  <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                    {post.platform?.platform?.[0] && (
                      <PlatformIcon platform={post.platform.platform[0]} className="h-4 w-4" />
                    )}
                    {post.platform?.platform?.[0] || 'Unknown'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Status</span>
                  <Badge 
                    variant="default"
                    className="!border-0 !text-white !bg-[#10B981]"
                  >
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between pb-4">
                  <span className="text-sm font-semibold text-foreground">Links</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent hover:text-primary"
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent hover:text-primary"
                    >
                      <AiOutlineX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Posts Card */}
          {relatedPosts.length > 0 && (
            <Card className="min-w-0">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-xl">Related Posts</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {relatedPosts.slice(0, 5).map((relatedPost) => (
                    <Link 
                      key={relatedPost.id}
                      href={`/${relatedPost.categories?.nodes[0]?.slug || 'uncategorized'}/${relatedPost.slug}`}
                      className="block group"
                    >
                      <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                        {relatedPost.featuredImage?.node && (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <NewsletterImage
                              src={relatedPost.featuredImage.node.sourceUrl}
                              alt={relatedPost.featuredImage.node.altText || relatedPost.title}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-medium line-clamp-2 group-hover:text-primary transition-colors">
                            {relatedPost.title}
                          </h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
} 