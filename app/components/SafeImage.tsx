'use client';

import Image from 'next/image';

interface SafeImageProps {
  src: string;
  alt: string;
  // Allow additional props (if needed)
  [key: string]: any;
}

export default function SafeImage({ src, alt, ...props }: SafeImageProps) {
  return (
    <Image src={src} alt={alt} {...props} />
  );
} 