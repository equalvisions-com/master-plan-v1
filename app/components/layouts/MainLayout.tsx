'use client';

import { ActivitySidebar } from "@/app/components/ActivitySidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  rightSidebar?: React.ReactNode;
}

export function MainLayout({ children, className, rightSidebar }: MainLayoutProps) {
  return (
    <div className={cn("main-grid", className)}>
      <section className="relative">
        <div>
          {children}
        </div>
      </section>
      {rightSidebar || <ActivitySidebar />}
    </div>
  );
} 