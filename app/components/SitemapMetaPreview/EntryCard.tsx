import { memo } from 'react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Loader2 } from 'lucide-react';
import { SitemapEntry } from '@/lib/sitemap/types';

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

  const handleLike = () => {
    startTransition(async () => {
      await onLikeToggle(entry.url);
    });
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      {/* ... other card content ... */}
      <Button 
        disabled={isPending}
        onClick={handleLike}
        variant="ghost"
        size="icon"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart fill={isLiked ? "currentColor" : "none"} />
        )}
      </Button>
      {/* ... other buttons ... */}
    </Card>
  );
}); 