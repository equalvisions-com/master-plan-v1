import { useCallback, useEffect } from 'react';

export function SitemapInfiniteScroll({ loadMore }: { loadMore: () => void }) {
  const handleScroll = useCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollHeight - (scrollTop + clientHeight) < window.innerHeight) {
      loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return null;
} 