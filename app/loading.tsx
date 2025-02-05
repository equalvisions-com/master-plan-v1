import { MainLayout } from "@/app/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RootLoading() {
  return (
    <div className="container-fluid">
      <MainLayout>
        <ScrollArea 
          className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
          type="always"
        >
          <div className="posts-list" />
        </ScrollArea>
      </MainLayout>
    </div>
  );
} 