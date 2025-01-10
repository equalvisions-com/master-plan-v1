'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, Search } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Input } from "@/app/components/ui/input";
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';
import Image from "next/image";
import { cn } from "@/lib/utils";

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

export function NavSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.key === '/' && 
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

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

  // Handle touch start events for mobile
  const handleTouchStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <div id="search-container" className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#757575]" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search"
          className={cn(
            "w-full bg-[#f3f3f3] hover:bg-[#e9e9e9]",
            "text-sm font-semibold text-[#757575]",
            "h-9 pl-10 pr-9",
            "rounded-lg border-0",
            "focus:ring-0 focus-visible:ring-0 focus:ring-offset-0",
            "focus:outline-none focus-visible:outline-none",
            "[&::-webkit-search-cancel-button]:appearance-none",
            "placeholder:font-medium"
          )}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          value={query}
          aria-label="Search posts"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#757575]" />
          ) : (
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <rect width="16" height="16" rx="3" fill="#808080" />
              <path 
                d="M6.33331 11.3333L9.66665 4.66667" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute w-full p-2 mt-6 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul 
          className="absolute z-50 w-full my-6 overflow-hidden bg-popover border border-border rounded-md shadow-sm overflow-y-auto max-h-[80vh]"
          onTouchStart={handleTouchStart}
        >
          {results.map((post) => (
            <li key={post.id} className="border-b border-border last:border-0">
              <button
                onClick={() => handleResultClick(post)}
                onTouchStart={handleTouchStart}
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