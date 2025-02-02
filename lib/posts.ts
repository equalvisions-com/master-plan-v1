import { serverQuery } from './apollo/query';
import { queries } from './graphql/queries';

export async function getPostData(slug: string) {
  const { data } = await serverQuery({
    query: queries.posts.getBySlug,
    variables: { slug }
  });
  
  return data?.post || null;
}

// Remove unused transform function since we're using direct GraphQL response
// If you need this for another purpose, add proper typing:
/*
interface DBPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  // ... other actual fields
}

function transformToWordPressPost(dbPost: DBPost): WordPressPost {
  return {
    id: dbPost.id,
    title: dbPost.title,
    content: dbPost.content,
    slug: dbPost.slug,
    // ... other required WordPressPost properties
  };
}
*/ 