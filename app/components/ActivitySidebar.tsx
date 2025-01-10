import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ActivitySidebar() {
  return (
    <aside className="w-[var(--activity-sidebar-width)] hidden lg:block">
      <ScrollArea 
        className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
        type="always"
      >
        <div className="space-y-[var(--content-spacing)]">
      

          {/* Activity Section */}
          <Card>
            <CardHeader className="px-[var(--content-spacing)] pt-[var(--content-spacing)]">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-[var(--content-spacing)] pb-[var(--content-spacing)] space-y-[var(--content-spacing-sm)]">
              {[
                { action: "commented on", post: "Getting Started with Next.js 15" },
                { action: "liked", post: "Understanding React Server Components" },
                { action: "bookmarked", post: "The Future of Web Development" },
                { action: "shared", post: "Building Modern UIs with Tailwind" },
                { action: "replied to", post: "GraphQL vs REST APIs" }
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-[var(--content-spacing-sm)]">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="space-y-[var(--content-spacing-xs)]">
                    <p className="text-sm">User {activity.action} <span className="font-medium">{activity.post}</span></p>
                    <p className="text-xs text-muted-foreground">{30 - i * 5} minutes ago</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Trending Section */}
          <Card>
            <CardHeader className="px-[var(--content-spacing)] pt-[var(--content-spacing)]">
              <CardTitle className="text-lg">Trending</CardTitle>
            </CardHeader>
            <CardContent className="px-[var(--content-spacing)] pb-[var(--content-spacing)] space-y-[var(--content-spacing-sm)]">
              {[
                { title: "The Complete Guide to Next.js App Router", views: 1200, comments: 45 },
                { title: "Why TypeScript is Taking Over", views: 980, comments: 32 },
                { title: "Building a Design System from Scratch", views: 850, comments: 28 },
                { title: "React Server Components Explained", views: 750, comments: 25 },
                { title: "The Power of Tailwind CSS", views: 620, comments: 19 }
              ].map((post, i) => (
                <div key={i} className="space-y-[var(--content-spacing-xs)]">
                  <h3 className="font-medium hover:text-primary cursor-pointer transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {post.views.toLocaleString()} views • {post.comments} comments
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Topics Section */}
          <Card>
            <CardHeader className="px-[var(--content-spacing)] pt-[var(--content-spacing)]">
              <CardTitle className="text-lg">Popular Topics</CardTitle>
            </CardHeader>
            <CardContent className="px-[var(--content-spacing)] pb-[var(--content-spacing)] space-y-[var(--content-spacing-sm)]">
              {[
                { name: "Next.js", posts: 128 },
                { name: "React", posts: 96 },
                { name: "TypeScript", posts: 84 },
                { name: "Tailwind CSS", posts: 72 },
                { name: "GraphQL", posts: 65 }
              ].map((topic, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-medium hover:text-primary cursor-pointer transition-colors">
                    #{topic.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {topic.posts} posts
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
} 