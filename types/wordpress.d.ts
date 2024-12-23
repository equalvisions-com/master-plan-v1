export interface WordPressPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  date: string;
  modified?: string;
  categories?: {
    nodes: WordPressCategory[];
  };
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
      mediaDetails?: {
        width?: number;
        height?: number;
      };
    };
  };
  seo?: WordPressSEO;
}

export interface WordPressCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
  startCursor: string;
  hasPreviousPage: boolean;
}

export interface PostsData {
  posts: {
    nodes: WordPressPost[];
    pageInfo: PageInfo;
  };
}

export interface CategoryData {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    posts?: {
      nodes: WordPressPost[];
      pageInfo: PageInfo;
    };
  } | null;
}

export interface WordPressSEO {
  title?: string;
  metaDesc?: string;
  canonical?: string;
  metaKeywords?: string;
  opengraphTitle?: string;
  opengraphDescription?: string;
  opengraphImage?: {
    sourceUrl: string;
    altText?: string;
    mediaDetails?: {
      width?: number;
      height?: number;
    };
  };
  opengraphSiteName?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: {
    sourceUrl: string;
    altText?: string;
    mediaDetails?: {
      width?: number;
      height?: number;
    };
  };
  metaRobotsNoindex?: string;
  metaRobotsNofollow?: string;
} 