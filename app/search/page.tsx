'use client';

import { SearchBar } from "@/app/components/SearchBar";
import { MainLayout } from "@/app/components/layouts/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SearchPage() {
  return (
    <div className="container-fluid">
      <MainLayout>
        <ScrollArea 
          className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
          type="always"
        >
          <div className="flex flex-col items-center gap-6">
            <SearchBar />
          </div>
        </ScrollArea>
      </MainLayout>
    </div>
  );
}
