export interface WordPressImage {
  node: {
    sourceUrl: string;
    altText: string;
  };
}

export interface WordPressCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  modified?: string;
  posts?: {
    nodes: WordPressPost[];
    pageInfo: PageInfo;
  };
}

interface SEOMediaDetails {
  height?: number;
  width?: number;
}

interface SEOImage {
  sourceUrl: string;
  altText?: string;
  srcSet?: string;
  mediaDetails?: SEOMediaDetails;
}

interface SEOSchema {
  articleType?: string;
  pageType?: string;
  raw?: string;
  isPiece?: boolean;
  isFAQ?: boolean;
  isReview?: boolean;
}

interface SEOSocial {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedIn?: string;
  mySpace?: string;
  pinterest?: string;
  youTube?: string;
  wikipedia?: string;
}

export interface SEOBreadcrumb {
  text: string;
  url: string;
}

interface SEOData {
  title?: string;
  metaDesc?: string;
  canonical?: string;
  cornerstone?: boolean;
  focuskw?: string;
  fullHead?: string;
  metaKeywords?: string;
  metaRobotsNofollow?: string;
  metaRobotsNoindex?: string;
  metaRobotsArchive?: string;
  metaRobotsImageIndex?: string;
  metaRobotsMaxImagePreview?: string;
  metaRobotsMaxSnippet?: string;
  metaRobotsMaxVideoPreview?: string;
  metaRobotsSnippet?: string;
  opengraphAuthor?: string;
  opengraphDescription?: string;
  opengraphModifiedTime?: string;
  opengraphPublishedTime?: string;
  opengraphPublisher?: string;
  opengraphSiteName?: string;
  opengraphTitle?: string;
  opengraphType?: string;
  opengraphUrl?: string;
  readingTime?: number;
  twitterDescription?: string;
  twitterTitle?: string;
  opengraphImage?: SEOImage;
  twitterImage?: SEOImage;
  schema?: SEOSchema;
  breadcrumbs?: SEOBreadcrumb[];
  social?: SEOSocial;
}

export interface WordPressPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  modified: string;
  excerpt: string;
  content: string;
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
  next?: {
    slug: string;
  };
  previous?: {
    slug: string;
  };
  seo?: SEOData;
  author?: {
    node: {
      firstName?: string;
      lastName?: string;
      name: string;
      url?: string;
      social?: {
        twitter?: string;
        twitterId?: string;
      };
    };
  };
  tags?: {
    nodes: Array<{
      name: string;
      slug: string;
    }>;
  };
  sitemapUrl?: string;
}

export interface PostData {
  post: WordPressPost;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
  startCursor: string | null;
  hasPreviousPage: boolean;
  total?: number;
  offsetPagination?: {
    total: number;
    hasMore: boolean;
  };
}

export interface PostConnection {
  nodes: WordPressPost[];
  edges?: Array<{
    cursor: string;
    node: WordPressPost;
  }>;
  pageInfo: PageInfo;
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
    posts: {
      nodes: WordPressPost[];
      pageInfo: PageInfo;
    };
  } | null;
}

export interface PostQueryResult {
  data: {
    post: WordPressPost;
  };
  error?: {
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
    extensions?: {
      code?: string;
      exception?: {
        stacktrace?: string[];
      };
    };
  };
}

export interface SEOError {
  code: string;
  message: string;
  field?: string;
}

export interface WordPressSEO {
  title?: string;
  metaDesc?: string;
  canonical?: string;
  cornerstone?: boolean;
  focuskw?: string;
  fullHead?: string;
  metaKeywords?: string;
  metaRobotsNofollow?: string;
  metaRobotsNoindex?: string;
  opengraphAuthor?: string;
  opengraphDescription?: string;
  opengraphModifiedTime?: string;
  opengraphPublishedTime?: string;
  opengraphPublisher?: string;
  opengraphSiteName?: string;
  opengraphTitle?: string;
  opengraphType?: string;
  opengraphUrl?: string;
  opengraphImage?: {
    sourceUrl: string;
    altText?: string;
    mediaDetails?: {
      height?: number;
      width?: number;
    }
  };
  readingTime?: number;
  twitterDescription?: string;
  twitterTitle?: string;
  twitterImage?: {
    sourceUrl: string;
    altText?: string;
    mediaDetails?: {
      height?: number;
      width?: number;
    }
  };
  schema?: {
    raw?: string;
  };
} 