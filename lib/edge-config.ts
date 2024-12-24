import { createClient, CacheConfig, FeatureFlags, SiteSettings } from '@vercel/edge-config';

export const edgeConfig = process.env.EDGE_CONFIG 
  ? createClient(process.env.EDGE_CONFIG)
  : null;

export type EdgeConfigData = {
  'cache-config': CacheConfig;
  'feature-flags': FeatureFlags;
  'site-settings': SiteSettings;
};

export async function getEdgeConfig<K extends keyof EdgeConfigData>(
  key: K
): Promise<EdgeConfigData[K] | undefined> {
  if (!edgeConfig) {
    console.warn('Edge Config is not initialized - missing EDGE_CONFIG environment variable');
    return undefined;
  }

  try {
    return await edgeConfig.get<EdgeConfigData[K]>(key);
  } catch (error) {
    console.error(`Error fetching edge config for key ${key}:`, error);
    return undefined;
  }
} 