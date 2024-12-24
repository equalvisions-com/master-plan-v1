import { getClient } from '@/lib/apollo/apollo-client';
import { queries } from "@/lib/graphql/queries/index";
import type { PostsData } from "@/types/wordpress";
import { PostListClient } from "./PostListClient";
import { notFound } from 'next/navigation';
import { config } from '@/config';

interface PostListProps {
  perPage?: number;
}

export async function PostList({ perPage = 6 }: PostListProps) {
  try {
    const client = await getClient();
    const { data } = await client.query<PostsData>({
      query: queries.posts.getLatest,
      variables: { 
        first: perPage,
        after: null
      },
      context: {
        fetchOptions: {
          next: { 
            revalidate: config.cache.ttl,
            tags: ['posts', 'content']
          }
        }
      }
    });

    if (!data?.posts?.nodes?.length) {
      return notFound();
    }

    return (
      <section>
        <PostListClient 
          posts={data.posts.nodes}
          pageInfo={data.posts.pageInfo}
        />
      </section>
    );
  } catch (error) {
    console.error('Error in PostList:', error);
    throw error;
  }
} 