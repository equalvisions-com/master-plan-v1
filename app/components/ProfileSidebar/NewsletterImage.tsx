'use client';

import Image from "next/image";
import { useState } from 'react';

interface NewsletterImageProps {
  src: string;
  alt: string;
}

export function NewsletterImage({ src, alt }: NewsletterImageProps) {
  const [error, setError] = useState(false);
  const fallbackImage = '/newsletter-logo.png';

  return (
    <Image
      src={error ? fallbackImage : src}
      alt={alt}
      fill
      className="object-cover rounded-md"
      onError={() => setError(true)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={false}
      quality={85}
    />
  );
} 