import { MainLayout } from "@/app/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="container-fluid h-full">
      <MainLayout>
        <ScrollArea 
          className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
          type="always"
        >
          <div className="flex items-center justify-center min-h-[calc(100svh-var(--header-height)-theme(spacing.12))]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </ScrollArea>
      </MainLayout>
    </div>
  );
} 