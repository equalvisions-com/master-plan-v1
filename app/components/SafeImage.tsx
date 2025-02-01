'use client';

import { useState } from 'react';
import Image from 'next/image';

export function SafeImage(props: any) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="bg-muted flex items-center justify-center aspect-video">
        <span className="text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return <Image {...props} onError={() => setError(true)} />;
} 