'use client';

import Image from "next/image";

interface NewsletterImageProps {
  src: string;
  alt: string;
}

export function NewsletterImage({ src, alt }: NewsletterImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover rounded-sm"
      priority
      sizes="80px"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = "/newsletter-logo.png";
      }}
    />
  );
} 