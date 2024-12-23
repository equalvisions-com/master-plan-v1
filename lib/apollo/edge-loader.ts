import { getClient } from './apollo-client'
import { queries } from '../graphql/queries'
import { config } from '@/config'
import { logger } from '@/lib/logger'

export async function loadPost(slug: string) {
  try {
    const client = await getClient()
    const { data } = await client.query({
      query: queries.posts.getBySlug,
      variables: { slug },
      context: {
        fetchOptions: {
          next: { 
            revalidate: config.cache.ttl,
            tags: ['posts', 'content', ...config.cache.tags.global]
          }
        }
      }
    })

    return data?.post || null
  } catch (error) {
    logger.error('Error loading post:', error)
    throw error
  }
}

export type { PostData } from '@/types/wordpress'