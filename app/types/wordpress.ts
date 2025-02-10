export interface SitemapUrlField {
  fieldGroupName: string;
  sitemapurl: string;
}

export interface WordPressPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  modified: string;
  excerpt: string;
  content: string;
  platform?: {
    fieldGroupName: string;
    platform: string[];
  };
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText: string;
      mediaDetails: {
        height: number;
        width: number;
      };
    };
  };
  categories: {
    nodes: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  };
  author?: {
    node: {
      name: string;
    };
  };
  sitemapUrl?: SitemapUrlField;
  relatedPosts?: {
    nodes?: WordPressPost[];
  };
  // ... other fields
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PostsDataStructure {
  nodes: WordPressPost[];
  pageInfo: PageInfo & { currentPage: number };
} 