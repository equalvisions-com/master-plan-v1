import { ActivitySidebar } from "@/app/components/ActivitySidebar";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  rightSidebar?: React.ReactNode;
}

// Simple loading component
function SidebarLoading() {
  return (
    <div className="h-[calc(100svh-var(--header-height)-theme(spacing.12))] w-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function MainLayout({ children, className, rightSidebar }: MainLayoutProps) {
  return (
    <div className={cn("container-fluid grid grid-cols-1 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-6", className)}>
      <section className="relative min-w-0">
        <div className="w-full">
          {children}
        </div>
      </section>
      <div className="min-w-0">
        {rightSidebar ? (
          <Suspense fallback={<SidebarLoading />}>
            {rightSidebar}
          </Suspense>
        ) : (
          <ActivitySidebar />
        )}
      </div>
    </div>
  );
} 