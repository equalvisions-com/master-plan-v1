import { getClient } from './apollo-client'
import { queries } from '../graphql/queries'
import { logger } from '@/lib/logger'

type FetchRequestConfig = {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export async function loadPost(slug: string, options?: FetchRequestConfig) {
  try {
    const client = await getClient()
    const { data } = await client.query({
      query: queries.posts.getBySlug,
      variables: { slug },
      context: {
        fetchOptions: options
      }
    })

    return data?.post || null
  } catch (error) {
    logger.error('Error loading post:', error)
    throw error
  }
}

export type { PostData } from '@/types/wordpress'