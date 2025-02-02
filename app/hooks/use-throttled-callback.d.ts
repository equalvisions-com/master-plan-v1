declare module '@/hooks/use-throttled-callback' {
  export function useThrottledCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number,
    deps?: any[]
  ): T;
} 