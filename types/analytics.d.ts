// Define types that match Vercel Analytics internal types
declare namespace VercelAnalytics {
  type AllowedValue = string | number | boolean | null;
  type AllowedArray = Array<AllowedValue>;
  type AllowedPropertyValues = AllowedValue | AllowedArray;
  
  interface EventProperties {
    [key: string]: AllowedPropertyValues;
  }
} 