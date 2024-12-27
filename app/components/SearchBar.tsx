'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Input } from "@/app/components/ui/input";
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';

interface SearchResult {
  id: string;
  title: string;
  excerpt?: string;
  slug: string;
  categories?: {
    nodes: Array<{
      slug: string;
      name: string;
    }>;
  };
  date?: string;
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const performSearch = async (value: string) => {
    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: value
        }),
      });

      const data = await response.json() as SearchResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Search request failed');
      }

      setResults(data.results);
      setIsOpen(true);
    } catch (err) {
      console.error('Search Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform search.');
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useDebouncedCallback(performSearch, 300);

  const handleResultClick = (post: SearchResult) => {
    const categorySlug = post.categories?.nodes[0]?.slug || 'uncategorized';
    const url = `/${categorySlug}/${post.slug}`;
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.getElementById('search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div id="search-container" className="relative w-full max-w-xl">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search posts..."
          className="w-full h-10 pl-4 pr-10 text-sm"
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          value={query}
          aria-label="Search posts"
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {error && (
        <div className="absolute w-full p-2 mt-1 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 overflow-hidden bg-popover border border-border rounded-md shadow-md max-h-[60vh] overflow-y-auto">
          {results.map((post) => (
            <li key={post.id} className="border-b border-border last:border-0">
              <button
                onClick={() => handleResultClick(post)}
                className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium line-clamp-1">{post.title}</h4>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.excerpt.replace(/(<([^>]+)>)/gi, '')}
                      </p>
                    )}
                  </div>
                  {post.categories?.nodes[0] && (
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full whitespace-nowrap">
                      {post.categories.nodes[0].name}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 