'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";

interface ScrollAreaWrapperProps {
  children: ReactNode;
}

export function ScrollAreaWrapper({ children }: ScrollAreaWrapperProps) {
  return (
    <ScrollArea 
      className="h-[calc(100svh-var(--header-height)-theme(spacing.12))]" 
      type="always"
    >
      {children}
    </ScrollArea>
  );
} 