import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";

export function PostListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex gap-4 items-start">
              <Skeleton className="w-[60px] h-[60px] flex-shrink-0 rounded-sm" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
} 