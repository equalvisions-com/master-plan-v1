export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  url: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
} 