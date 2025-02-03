import { memo } from 'react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Heart, Loader2, ExternalLink } from 'lucide-react';
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
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <h3 className="font-medium line-clamp-2">{entry.meta.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
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
            <Button
              as="a"
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="icon"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {entry.meta.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {entry.meta.description}
          </p>
        )}
        {entry.meta.image && (
          <img 
            src={entry.meta.image} 
            alt={entry.meta.title}
            className="w-full h-32 object-cover rounded-md"
          />
        )}
      </div>
    </Card>
  );
}); 