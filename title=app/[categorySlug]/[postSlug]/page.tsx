import { createClient } from '@/lib/supabase/server';
import { getPostData } from '@/lib/posts'; // adjust according to your data fetch function
import { MainLayout } from '@/app/components/layouts/MainLayout';
import { PostList } from '@/app/components/posts';
import type { WordPressPost } from '@/types/wordpress';

export default async function PostPage({ params }: { params: { categorySlug: string, postSlug: string } }) {
  // Fetch the post data (and possibly posts feed) as you normally do
  const post = await getPostData(params.postSlug);
  if (!post) throw new Error('Post not found');

  // Instantiate your Supabase server client and get the user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Initialize liked posts array (you can also fetch meta_like if you use the meta URL)
  let initialLikedUrls: string[] = [];

  if (user) {
    const { data: likes } = await supabase
      .from('meta_likes')
      .select('meta_url')
      .eq('user_id', user.id);
    
    // Extract liked URLs
    initialLikedUrls = likes?.map((like: { meta_url: string }) => like.meta_url) || [];
  }

  // Prepare post feed data and add userHasLiked field (for example, using the sitemap URL as the meta URL)
  const posts: WordPressPost[] = (post.posts.nodes || []).map((post) => ({
    ...post,
    userHasLiked: post.sitemapUrl?.sitemapurl
      ? initialLikedUrls.includes(post.sitemapUrl?.sitemapurl)
      : false
  }));

  return (
    <MainLayout>
      <PostList posts={posts} />
    </MainLayout>
  );
} 