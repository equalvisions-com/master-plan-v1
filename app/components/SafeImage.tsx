'use client';

import Image from 'next/image';

interface SafeImageProps {
  src: string;
  alt: string;
  // Allow additional props with unknown type instead of any
  [key: string]: unknown;
}

export default function SafeImage({ src, alt, ...props }: SafeImageProps) {
  return (
    <Image src={src} alt={alt} {...props} />
  );
} 