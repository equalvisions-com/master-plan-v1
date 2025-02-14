import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import { Newspaper, Users, Heart, Globe, Mail } from "lucide-react";
import { AiOutlineX } from "react-icons/ai";
import Link from "next/link";
import type { WordPressPost } from "@/types/wordpress";
import { BookmarkButton } from '@/app/components/BookmarkButton/Client';
import { NewsletterImage } from './NewsletterImage';
import { Badge } from "@/components/ui/badge";
import { getPlatformUrl } from '@/app/lib/utils/platformMap';
import { prisma } from '@/lib/prisma';

type PostWithPlatform = WordPressPost;

interface ProfileSidebarProps {
  user: User | null;
  post: PostWithPlatform;
  relatedPosts?: WordPressPost[];
  totalPosts?: number;
  followerCount?: number;
  isActive?: boolean;
  totalLikes?: number;
}

export async function ProfileSidebar({ user, post, relatedPosts = [], totalPosts = 0, followerCount = 0, isActive = false, totalLikes = 0 }: ProfileSidebarProps) {
  // Fetch all bookmark statuses in one query if user is logged in
  const bookmarkStatuses = user ? await prisma.bookmark.findMany({
    where: {
      user_id: user.id,
      post_id: {
        in: [...relatedPosts.map(post => post.id), post.id]
      }
    },
    select: {
      post_id: true
    }
  }) : [];

  // Create a Set for O(1) lookup
  const bookmarkedPostIds = new Set(bookmarkStatuses.map(b => b.post_id));

  const platformName = post.platform?.platform?.[0];

  const newsletterData = {
    name: post.title,
    title: "Newsletter",
    description: post.excerpt?.replace(/(<([^>]+)>)/gi, "").trim() || "",
    image: post.featuredImage?.node?.sourceUrl || "/newsletter-logo.png",
  };

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
                    {post.id && (
                      <>
                        <BookmarkButton
                          postId={post.id}
                          title={post.title}
                          sitemapUrl={post.sitemapUrl?.sitemapurl || null}
                          user={user}
                          initialIsBookmarked={bookmarkedPostIds.has(post.id)}
                          featuredImage={post.featuredImage?.node?.sourceUrl || null}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full w-9 h-9 p-0 flex items-center justify-center"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground leading-normal">
                {newsletterData.description}
              </p>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="min-w-0">
            <CardContent className="p-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex justify-between gap-4 min-w-max">
                <p className="text-sm font-semibold inline-flex items-center gap-1 shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}
                </p>
                <p className="text-sm font-semibold inline-flex items-center gap-1 shrink-0">
                  <Newspaper className="h-3.5 w-3.5" />
                  {totalPosts} Posts
                </p>
                <p className="text-sm font-semibold inline-flex items-center gap-1 shrink-0">
                  <Heart className="h-3.5 w-3.5" />
                  {totalLikes} Likes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Platform Info Card */}
          <Card className="min-w-0">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Status</span>
                  <Badge 
                    variant="default"
                    className={`!border-0 !text-white !font-normal !text-sm ${isActive ? '!bg-[#10B981]' : '!bg-[#EF4444]'}`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Category</span>
                  <Link 
                    href={`/${post.categories?.nodes[0]?.slug || 'uncategorized'}`}
                    className="text-sm text-foreground no-underline border-b border-dotted border-muted-foreground hover:text-muted-foreground transition-colors"
                  >
                    {post.categories?.nodes[0]?.name || 'Uncategorized'}
                  </Link>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Author</span>
                  {post.author?.authorname ? (
                    post.author.authorurl ? (
                      <Link 
                        href={post.author.authorurl}
                        className="text-sm text-foreground no-underline border-b border-dotted border-muted-foreground hover:text-muted-foreground transition-colors"
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
                  <span className="text-sm text-muted-foreground">
                    {platformName ? (
                      <Link 
                        href={getPlatformUrl(platformName) || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-foreground no-underline border-b border-dotted border-muted-foreground hover:text-muted-foreground transition-colors"
                      >
                        {platformName}
                      </Link>
                    ) : (
                      'Unknown'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
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
          {relatedPosts
            .filter(relatedPost => relatedPost.id !== post.id)
            .length > 0 && (
            <Card className="min-w-0">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-xl">Related Posts</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {relatedPosts
                    .filter(relatedPost => relatedPost.id !== post.id)
                    .slice(0, 5)
                    .map((relatedPost) => (
                    <div key={relatedPost.id} className="flex items-start gap-3">
                      <Link 
                        href={`/${relatedPost.categories?.nodes[0]?.slug || 'uncategorized'}/${relatedPost.slug}`}
                        className="flex-1 flex items-start gap-3 group"
                      >
                        {relatedPost.featuredImage?.node && (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <NewsletterImage
                              src={relatedPost.featuredImage.node.sourceUrl}
                              alt={relatedPost.featuredImage.node.altText || relatedPost.title}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-muted-foreground transition-colors">
                            {relatedPost.title}
                          </h4>
                        </div>
                      </Link>
                      {relatedPost.id && (
                        <div className="flex-shrink-0">
                          <BookmarkButton
                            postId={relatedPost.id}
                            title={relatedPost.title}
                            sitemapUrl={relatedPost.sitemapUrl?.sitemapurl || null}
                            user={user}
                            initialIsBookmarked={bookmarkedPostIds.has(relatedPost.id)}
                            featuredImage={relatedPost.featuredImage?.node?.sourceUrl || null}
                          />
                        </div>
                      )}
                    </div>
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