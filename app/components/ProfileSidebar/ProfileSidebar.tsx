import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import { MoreHorizontal, Newspaper, Users, BarChart2 } from "lucide-react";
import Link from "next/link";
import type { WordPressPost } from "@/types/wordpress";
import { Suspense } from "react";
import { BookmarkButton } from '@/app/components/BookmarkButton';
import { BookmarkLoading } from '@/app/components/BookmarkButton/loading';
import { NewsletterImage } from './NewsletterImage';

interface ProfileSidebarProps {
  user: User | null;
  post: WordPressPost;
  relatedPosts?: WordPressPost[];
}

export function ProfileSidebar({ user, post, relatedPosts = [] }: ProfileSidebarProps) {
  const newsletterData = {
    name: post.title,
    title: "Newsletter",
    description: post.excerpt?.replace(/(<([^>]+)>)/gi, "").trim() || "",
    image: post.featuredImage?.node?.sourceUrl || "/newsletter-logo.png",
    author: {
      name: "Ben Tossell",
      avatar: user?.user_metadata?.avatar_url || "https://media.beehiiv.com/cdn-cgi/image/format=auto,width=400,height=211,fit=scale-down,onerror=redirect/uploads/user/profile_picture/fc858b4d-39e3-4be1-abf4-2b55504e21a2/uJ4UYake_400x400.jpg"
    }
  };

  return (
    <aside className="w-[var(--activity-sidebar-width)] hidden lg:block">
      <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" type="always">
        <div className="space-y-4">
          {/* Newsletter Profile Card */}
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <NewsletterImage
                    src={newsletterData.image}
                    alt={post.featuredImage?.node?.altText || newsletterData.name}
                  />
                </div>
                <div className="text-left pt-2 flex-1">
                  <CardTitle className="text-xl">{newsletterData.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      className="hover:bg-primary/90 transition-colors w-full sm:w-auto rounded-full" 
                      size="sm"
                    >
                      Subscribe
                    </Button>
                    {post.id && (
                      <Suspense fallback={<BookmarkLoading />}>
                        <BookmarkButton
                          postId={post.id}
                          title={post.title}
                          sitemapUrl={post.sitemapUrl?.sitemapurl ?? null}
                          user={user}
                        />
                      </Suspense>
                    )}
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground leading-normal mb-2.5">
                {newsletterData.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/topic/tech" className="text-sm text-foreground font-semibold hover:text-primary transition-colors leading-tight">
                  #tech
                </Link>
                <Link href="/topic/startups" className="text-sm text-foreground font-semibold hover:text-primary transition-colors leading-tight">
                  #startups
                </Link>
                <Link href="/topic/nocode" className="text-sm text-foreground font-semibold hover:text-primary transition-colors leading-tight">
                  #nocode
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4" />
                    <p className="text-base font-semibold">2.1k</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Newspaper className="h-4 w-4" />
                    <p className="text-base font-semibold">123</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Posts</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <BarChart2 className="h-4 w-4" />
                    <p className="text-base font-semibold">97%</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Author Info */}
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xl">Author</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={newsletterData.author.avatar} />
                    <AvatarFallback>
                      {newsletterData.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold leading-tight">{newsletterData.author.name}</h3>
                    <p className="text-sm text-muted-foreground">@BenTossell</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Posts Card */}
          {relatedPosts.length > 0 && (
            <Card>
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