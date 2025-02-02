import { serverQuery } from './apollo/query';
import { queries } from './graphql/queries';
import type { WordPressPost } from '@/types/wordpress';

export async function getPostData(slug: string) {
  const { data } = await serverQuery({
    query: queries.posts.getBySlug,
    variables: { slug }
  });
  
  return data?.post || null;
}

function transformToWordPressPost(dbPost: any): WordPressPost {
  return {
    id: dbPost.id,
    title: dbPost.title,
    content: dbPost.content,
    slug: dbPost.slug,
    // ... other required WordPressPost properties
  };
} 