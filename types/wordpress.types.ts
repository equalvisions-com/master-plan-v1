export interface PostsData {
  posts: {
    nodes: WordPressPost[];
  };
}

export interface WordPressCategory {
  id: string;
  name: string;
  slug: string;
}

export interface WordPressPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText: string;
    };
  };
  categories: {
    nodes: WordPressCategory[];
  };
} 