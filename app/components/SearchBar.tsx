'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Input } from "@/app/components/ui/input";
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';
import Image from "next/image";

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
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

interface SearchBarProps {
  onSelect?: () => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
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
    onSelect?.();
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search newsletters..."
          className="w-full h-10 pl-9 pr-9 text-md focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none shadow-sm [&::-webkit-search-cancel-button]:appearance-none"
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
        <div className="absolute w-full p-2 mt-6 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full my-6 overflow-hidden bg-popover border border-border rounded-md shadow-sm overflow-y-auto"
          style={{
            maxHeight: 'calc(100vh - var(--container-padding) - var(--search-offset))',
          }}
        >
          {results.map((post) => (
            <li key={post.id} className="border-b border-border last:border-0">
              <button
                onClick={() => handleResultClick(post)}
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-3">
                  {post.featuredImage?.node && (
                    <div className="relative flex-shrink-0 w-16 h-16">
                      <Image
                        src={post.featuredImage.node.sourceUrl}
                        alt={post.featuredImage.node.altText || post.title}
                        fill
                        className="object-cover rounded-md"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 justify-between items-start gap-2">
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
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 