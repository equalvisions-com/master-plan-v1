export const dynamic = 'force-static';
export const revalidate = false;

import { PostListSkeleton } from '@/app/components/loading/PostListSkeleton';
import { MainLayout } from "@/app/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

// Single default export for the loading state
export default function Loading() {
  return (
    <div className="container-fluid">
      <MainLayout>
        <ScrollArea 
          className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
          type="always"
        >
          <div className="posts-list">
            <PostListSkeleton />
          </div>
        </ScrollArea>
      </MainLayout>
    </div>
  );
} 