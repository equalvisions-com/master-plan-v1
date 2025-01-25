import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Users, BarChart2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ActionButtons } from "./ActionButtons";
import type { ProfileSidebarProps } from "./types";

export function ProfileSidebar({ user, post }: ProfileSidebarProps) {
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
            <CardHeader className="p-4 pb-0">
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <Image
                    src={newsletterData.image}
                    alt={post.featuredImage?.node?.altText || newsletterData.name}
                    fill
                    className="object-cover rounded-full"
                    priority
                    sizes="80px"
                  />
                </div>
                <div className="text-left pt-2 flex-1">
                  <CardTitle className="text-xl">{newsletterData.name}</CardTitle>
                  <ActionButtons user={user} post={post} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                {newsletterData.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/topic/tech" className="text-sm text-foreground font-semibold hover:text-primary transition-colors">
                  #tech
                </Link>
                <Link href="/topic/startups" className="text-sm text-foreground font-semibold hover:text-primary transition-colors">
                  #startups
                </Link>
                <Link href="/topic/nocode" className="text-sm text-foreground font-semibold hover:text-primary transition-colors">
                  #nocode
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xl">
                Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">Subscribers</h3>
                  </div>
                  <Badge variant="secondary">1.2k</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center">
                      <Newspaper className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">Issues</h3>
                  </div>
                  <Badge variant="secondary">52</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center">
                      <BarChart2 className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">Visitors</h3>
                  </div>
                  <Badge variant="secondary">8.5k</Badge>
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
        </div>
      </ScrollArea>
    </aside>
  );
} 