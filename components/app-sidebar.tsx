"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { 
  HomeIcon,
  SearchIcon,
  SparklesIcon,
  InboxIcon,
  MenuIcon,
  BookmarkIcon,
  UserIcon
} from "lucide-react";
import { NavUser } from "@/components/nav/NavUser";
import { User } from '@supabase/supabase-js'

const navItems = [
  {
    title: "Home",
    href: "/",
    icon: <HomeIcon className="h-4 w-4" />
  },
  {
    title: "Search",
    href: "/search",
    icon: <SearchIcon className="h-4 w-4" />
  },
  {
    title: "Ask AI",
    href: "/ask",
    icon: <SparklesIcon className="h-4 w-4" />
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: <InboxIcon className="h-4 w-4" />
  },
  {
    title: "Bookmarks",
    href: "/bookmarks",
    icon: <BookmarkIcon className="h-4 w-4" />
  },
  {
    title: "Profile",
    href: "/profile",
    icon: <UserIcon className="h-4 w-4" />
  }
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User | null;
}

export function AppSidebar({ user, className, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      className={className}
      variant="inset" 
      collapsible="icon" 
      {...props}
    >
      <SidebarHeader>
        <div className="flex h-14 items-center px-4">
          {isCollapsed ? (
            <div className="md:hidden">
              <MenuIcon className="h-6 w-6" />
            </div>
          ) : (
            <span className="text-lg font-semibold">Navigation</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild
                  className={pathname === item.href ? "bg-secondary" : ""}
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    {item.icon}
                    {!isCollapsed && (
                      <span>{item.title}</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
