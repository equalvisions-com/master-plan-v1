import Image from 'next/image';

interface PlatformData {
  icon: string;
  alt: string;
  url: string;
}

export const PLATFORM_MAP: Record<string, PlatformData> = {
  'Beehiiv': {
    icon: '/platforms/beehiiv.png',
    alt: 'Beehiiv Logo',
    url: 'https://beehiiv.com'
  },
  'Substack': {
    icon: '/platforms/substack.png',
    alt: 'Substack Logo',
    url: 'https://substack.com'
  }
} as const;

export type PlatformType = keyof typeof PLATFORM_MAP;

export function getPlatformData(platform: string | undefined): PlatformData | null {
  if (!platform) return null;
  return PLATFORM_MAP[platform as PlatformType] || null;
}

interface PlatformIconProps {
  platform: string;
  className?: string;
}

export function PlatformIcon({ platform, className = "" }: PlatformIconProps) {
  const platformData = getPlatformData(platform);
  
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