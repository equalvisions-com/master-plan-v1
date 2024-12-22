// Augment the @vercel/analytics module types
declare module '@vercel/analytics/server' {
  type AllowedValue = string | number | boolean | null;
  type AllowedArray = Array<AllowedValue>;
  type AllowedPropertyValues = AllowedValue | AllowedArray;

  interface TrackOptions {
    request: Request;
  }

  export function track(
    event: string,
    properties: Record<string, AllowedPropertyValues>,
    options: TrackOptions
  ): Promise<void>;
} 