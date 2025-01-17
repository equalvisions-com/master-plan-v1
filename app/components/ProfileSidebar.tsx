'use client';

import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/app/components/ui/button";
import { Mail, Globe, BarChart2, Clock, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { WordPressPost } from "@/types/wordpress";

interface ProfileSidebarProps {
  user: User | null;
  post: WordPressPost;
}

export function ProfileSidebar({ user, post }: ProfileSidebarProps) {
  // Newsletter data now uses post content
  const newsletterData = {
    name: post.title,
    title: "Newsletter",
    description: post.excerpt?.replace(/(<([^>]+)>)/gi, "").trim() || "",
    image: post.featuredImage?.node?.sourceUrl || "/newsletter-logo.png",
    author: {
      name: post.author?.node?.name || "Anonymous",
      role: "Newsletter Author",
      avatar: user?.user_metadata?.avatar_url
    }
  };

  const handleSubscribe = () => {
    // TODO: Implement newsletter subscription
    console.log('Subscribe clicked');
  };

  
  return (
    <aside className="w-[var(--activity-sidebar-width)] hidden lg:block">
      <ScrollArea className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" type="always">
        <div className="space-y-4">
          {/* Newsletter Profile Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <Image
                  src={newsletterData.image}
                  alt={post.featuredImage?.node?.altText || newsletterData.name}
                  fill
                  className="object-cover rounded-lg"
                  priority
                  sizes="128px"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/newsletter-logo.png";
                  }}
                />
              </div>
              <CardTitle className="text-xl">{newsletterData.name}</CardTitle>
              <p className="text-sm font-medium text-muted-foreground">
                {newsletterData.title}
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {newsletterData.description}
              </p>
              <Button 
                className="w-full hover:bg-primary/90 transition-colors" 
                size="sm" 
                onClick={handleSubscribe}
              >
                <Mail className="mr-2 h-4 w-4" />
                Subscribe
              </Button>
            </CardContent>
          </Card>

          {/* Author Info */}
          <Card>
            <CardHeader>
              <CardTitle>About the Author</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={newsletterData.author.avatar} />
                  <AvatarFallback>
                    {newsletterData.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{newsletterData.author.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {newsletterData.author.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart2 className="w-4 h-4 mr-2" />
                Newsletter Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">52</p>
                  <p className="text-sm text-muted-foreground">Issues</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">1.2k</p>
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recent Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                      <span className="text-sm font-medium">#{i + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Issue {52 - i}</h4>
                      <p className="text-xs text-muted-foreground">
                        {i === 0 ? "2 days ago" : i === 1 ? "1 week ago" : "2 weeks ago"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Featured Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Featured Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((_, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="relative w-full h-24 mb-2">
                      <Image
                        src={`/placeholder-${i + 1}.jpg`}
                        alt="Featured content"
                        fill
                        className="object-cover rounded-md group-hover:opacity-90 transition-opacity"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/newsletter-logo.png";
                        }}
                      />
                    </div>
                    <h4 className="text-sm font-medium group-hover:text-primary transition-colors">
                      Featured Article {i + 1}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      A brief description of the featured content
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact & Social */}
          <Card>
            <CardHeader>
              <CardTitle>Connect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Link href={post.author?.node?.url || '#'}>
                  <Button variant="ghost" size="icon">
                    <Globe className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  View author profile for more information
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
} 