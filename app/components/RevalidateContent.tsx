'use client';

import { useEffect } from 'react';

export function RevalidateContent({ tags }: { tags: string[] }) {
  useEffect(() => {
    const revalidate = async () => {
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-token': process.env.NEXT_PUBLIC_REVALIDATION_TOKEN || '',
          },
          body: JSON.stringify({ tags }),
        });
      } catch (error) {
        console.error('Failed to revalidate:', error);
      }
    };

    revalidate();
  }, [tags]);

  return null;
} 