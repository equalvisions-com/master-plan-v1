"use client";

import * as React from "react";
import { useState, useEffect } from "react";
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
  UserIcon,
  HashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  {
    title: "Home",
    href: "/",
    icon: <HomeIcon className="h-4 w-4" />
  },
  {
    title: "Categories",
    href: "/categories",
    icon: <HashIcon className="h-4 w-4" />,
    children: [
      { title: "Technology", href: "/technology" },
      { title: "Travel", href: "/travel" },
      { title: "Food", href: "/food" },
      { title: "Lifestyle", href: "/lifestyle" },
      { title: "Business", href: "/business" },
      { title: "Health", href: "/health" },
      { title: "Science", href: "/science" },
      { title: "Sports", href: "/sports" },
      { title: "Entertainment", href: "/entertainment" },
      { title: "Education", href: "/education" },
      { title: "Fashion", href: "/fashion" },
      { title: "Art & Design", href: "/art-design" },
      { title: "Photography", href: "/photography" },
      { title: "Music", href: "/music" },
      { title: "Gaming", href: "/gaming" }
    ]
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
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(pathname);

  useEffect(() => {
    setIsCategoriesOpen(false);
    setActiveItem(pathname);
  }, [pathname]);

  const handleCategoriesClick = () => {
    if (isCollapsed) {
      setOpen(true);
    }
    setIsCategoriesOpen(!isCategoriesOpen);
    setActiveItem(null);
  };

  const handleItemClick = (href: string) => {
    setIsCategoriesOpen(false);
    setActiveItem(href);
  };

  const isItemActive = (item: typeof navItems[0]) => {
    if (isCategoriesOpen && !item.children) {
      return false;
    }

    if (item.children) {
      return item.children.some(child => child.href === activeItem);
    }
    
    return activeItem === item.href;
  };

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
                  asChild={!item.children}
                  className={cn(
                    (isItemActive(item) || (item.children && isCategoriesOpen))
                      ? "bg-secondary" 
                      : ""
                  )}
                  onClick={
                    item.children 
                      ? handleCategoriesClick
                      : () => handleItemClick(item.href)
                  }
                >
                  {item.children ? (
                    <div className="flex items-center w-full">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        {!isCollapsed && (
                          <span>{item.title}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Link 
                      href={item.href} 
                      className="flex items-center gap-2"
                      onClick={() => handleItemClick(item.href)}
                    >
                      {item.icon}
                      {!isCollapsed && (
                        <span>{item.title}</span>
                      )}
                    </Link>
                  )}
                </SidebarMenuButton>
                {item.children && !isCollapsed && isCategoriesOpen && (
                  <SidebarMenu>
                    <ScrollArea className="h-[300px] w-full pr-4 mt-3" type="always">
                      <div className="ml-6">
                        {item.children.map((child, index) => (
                          <SidebarMenuItem key={child.href}>
                            <SidebarMenuButton 
                              asChild
                              className={cn(
                                activeItem === child.href ? "bg-secondary" : "",
                                index === 0 ? "pt-0" : ""
                              )}
                            >
                              <Link 
                                href={child.href}
                                onClick={() => handleItemClick(child.href)}
                              >
                                {child.title}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    </ScrollArea>
                  </SidebarMenu>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
