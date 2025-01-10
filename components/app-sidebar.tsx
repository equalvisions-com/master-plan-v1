"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { 
  HomeIcon,
  SearchIcon,
  SparklesIcon,
  InboxIcon,
  BookmarkIcon,
  UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  className?: string;
}

export function AppSidebar({ className, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      className={cn(
        "border-none transition-all duration-1 ease-in-out",
        isCollapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
        className
      )}
      variant="floating" 
      collapsible="icon" 
      {...props}
    >
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
    </Sidebar>
  );
}
