export const PLATFORM_MAP: Record<string, string> = {
  'Beehiiv': 'https://beehiiv.com',
  'Substack': 'https://substack.com'
} as const;

export type PlatformType = keyof typeof PLATFORM_MAP;

export function getPlatformUrl(platform: string | undefined): string | null {
  if (!platform) return null;
  return PLATFORM_MAP[platform as PlatformType] || null;
} 