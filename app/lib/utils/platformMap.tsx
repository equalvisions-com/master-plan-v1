import Image from 'next/image';

export const PLATFORM_MAP = {
  'Beehiiv': {
    icon: '/platforms/beehiiv.png',
    alt: 'Beehiiv Logo'
  },
  'Substack': {
    icon: '/platforms/substack.png',
    alt: 'Substack Logo'
  }
} as const;

export type PlatformType = keyof typeof PLATFORM_MAP;

interface PlatformIconProps {
  platform: string;
  className?: string;
}

export function PlatformIcon({ platform, className = "" }: PlatformIconProps) {
  const platformData = PLATFORM_MAP[platform as PlatformType];
  
  if (!platformData) return null;

  return (
    <Image
      src={platformData.icon}
      alt={platformData.alt}
      width={16}
      height={16}
      className={`rounded-sm ${className}`}
    />
  );
} 