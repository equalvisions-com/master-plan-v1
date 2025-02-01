'use client';

export function ClientContent({ post, metaEntries }: { 
  post: WordPressPost;
  metaEntries: SitemapEntry[];
}) {
  return (
    <article className="max-w-4xl">
      <div className="space-y-8">
        <SitemapMetaPreview post={post} initialEntries={metaEntries} />
      </div>
    </article>
  );
} 