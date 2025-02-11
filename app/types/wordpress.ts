export interface SitemapUrlField {
  fieldGroupName: string;
  sitemapurl: string;
}

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

export interface WordPressAuthor {
  authorname: string;
  authorurl: string;
}

export interface WordPressPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  sitemapUrl?: {
    sitemapurl?: string;
  };
  posts?: {
    nodes?: WordPressPost[];
  };
  date: string;
  modified: string;
  excerpt: string;
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
    authorname: string;
    authorurl: string;
    fieldGroupName?: string;
  };
  tags?: {
    nodes: Array<{
      name: string;
      slug: string;
    }>;
  };
  platform?: {
    fieldGroupName: string;
    platform: string[];
  };
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