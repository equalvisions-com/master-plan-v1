import { track } from '@vercel/analytics/server';

interface BaseTrackingData {
  success: boolean;
  duration?: number;
  key?: string;
  tags?: string[];
  request?: Request;
}

interface CacheTrackingData extends BaseTrackingData {
  type?: 'new_post' | 'update' | 'delete';
}

interface PerformanceTrackingData extends BaseTrackingData {
  cache?: boolean;
  errorMessage?: string;
  path?: string;
  ttfb?: number;
  cacheHit?: boolean;
  region?: string;
}

interface RequestMetadata {
  method: string;
  url: string;
  headers?: Record<string, string>;
}

interface SEOTrackingData {
  postId: string;
  slug: string;
  type: string;
  status?: string;
  success: boolean;
  hasMetaDesc: boolean;
  hasOgImage: boolean;
  hasTwitterImage: boolean;
  metaDesc?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  categories?: string[];
  request: RequestMetadata;
}

type TrackEventData = Record<string, string | number | boolean | null | Array<string | number | boolean | null>>;

export class Monitoring {
  private static isProduction = process.env.NODE_ENV === 'production';
  private static isDevelopment = process.env.NODE_ENV === 'development';

  private static async trackEvent(
    eventName: string, 
    data: TrackEventData,
    request?: Request
  ) {
    if (this.isProduction && request) {
      try {
        await track(eventName, data, { request });
      } catch (error) {
        console.error(`Failed to track ${eventName}:`, error);
      }
    } else if (this.isDevelopment) {
      console.log(`[DEV] ${eventName} event:`, data);
    }
  }

  static async trackPerformance(operation: string, data: PerformanceTrackingData) {
    const trackData: TrackEventData = {
      operation,
      duration: data.duration || 0,
      success: data.success || false,
      cache: data.cache || false,
      path: data.path || '',
      timestamp: Date.now(),
      tags: data.tags || [],
      errorMessage: data.errorMessage || null
    };

    await this.trackEvent('performance', trackData, data.request);
  }

  static async trackCache(operation: string, data: CacheTrackingData) {
    const trackData: TrackEventData = {
      operation,
      key: data.key || '',
      duration: data.duration || 0,
      tagCount: data.tags?.length || 0,
      timestamp: Date.now()
    };

    await this.trackEvent('cache', trackData, data.request);
  }

  static async trackSEO(operation: string, data: SEOTrackingData) {
    const trackData: TrackEventData = {
      operation,
      postId: data.postId,
      type: data.type,
      slug: data.slug,
      success: data.success,
      hasMetaDesc: data.hasMetaDesc,
      hasOgImage: data.hasOgImage,
      hasTwitterImage: data.hasTwitterImage,
      metaDesc: data.metaDesc || null,
      ogTitle: data.ogTitle || null,
      ogDescription: data.ogDescription || null,
      ogImage: data.ogImage || null,
      twitterTitle: data.twitterTitle || null,
      twitterDescription: data.twitterDescription || null,
      twitterImage: data.twitterImage || null,
      canonical: data.canonical || null,
      timestamp: Date.now()
    };

    const request = new Request(data.request.url, {
      method: data.request.method,
      headers: new Headers(data.request.headers || {})
    });

    await this.trackEvent('seo', trackData, request);
  }
} 