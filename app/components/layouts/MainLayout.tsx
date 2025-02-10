import { ActivitySidebar } from "@/app/components/ActivitySidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  rightSidebar?: React.ReactNode;
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
        {rightSidebar || <ActivitySidebar />}
      </div>
    </div>
  );
} 