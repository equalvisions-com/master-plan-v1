import { memo } from 'react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Heart, Loader2 } from 'lucide-react';
import { SitemapEntry } from '@/app/lib/sitemap/types';

interface EntryCardProps {
  entry: SitemapEntry;
  isLiked: boolean;
  onLikeToggle: (url: string) => Promise<void>;
}

export const EntryCard = memo(function EntryCard({ 
  entry, 
  isLiked, 
  onLikeToggle 
}: EntryCardProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      {/* ... other card content ... */}
      <Button 
        disabled={isPending}
        onClick={() => startTransition(() => onLikeToggle(entry.url))}
        variant="ghost"
        size="icon"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
        )}
      </Button>
      {/* ... other buttons ... */}
    </Card>
  );
}); 