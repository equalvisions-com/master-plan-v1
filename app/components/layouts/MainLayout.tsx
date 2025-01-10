'use client';

import { ActivitySidebar } from "@/app/components/ActivitySidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className={cn("main-grid", className)}>
      <section className="relative">
        <div>
          {children}
        </div>
      </section>
      <ActivitySidebar />
    </div>
  );
} 