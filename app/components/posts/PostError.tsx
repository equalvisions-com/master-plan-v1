'use client';

export function PostError() {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold mb-2">Error loading posts</h2>
      <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
    </div>
  );
} 