import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Heart, Loader2 } from 'lucide-react';
import { SitemapEntry } from '@/lib/sitemap/types';
import { cn } from '@/lib/utils';

interface EntryCardProps {
  entry: SitemapEntry;
  isLiked: boolean;
  onLikeToggle: (url: string) => Promise<void>;
  isPending: boolean;
}

export const EntryCard = memo(function EntryCard({ 
  entry, 
  isLiked, 
  onLikeToggle,
  isPending
}: EntryCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      {/* ... other card content ... */}
      <Button 
        onClick={() => onLikeToggle(entry.url)}
        variant="ghost"
        size="icon"
        disabled={isPending}
        aria-disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart 
            className={cn("h-4 w-4", isLiked && "fill-current")}
          />
        )}
      </Button>
      {/* ... other buttons ... */}
    </Card>
  );
}); 