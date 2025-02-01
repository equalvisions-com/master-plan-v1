'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SafeImageProps {
  altText?: string;
} & React.ComponentPropsWithoutRef<'img'>;

export function SafeImage({ altText, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="bg-muted flex items-center justify-center aspect-video">
        <span className="text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return <Image
    alt={altText || ""}
    {...props}
    onError={() => setError(true)}
  />;
} 