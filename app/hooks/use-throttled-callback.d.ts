declare module '@/app/hooks/use-throttled-callback' {
  export function useThrottledCallback<P extends unknown[], R>(
    callback: (...args: P) => R,
    delay: number,
    deps?: React.DependencyList
  ): (...args: P) => R;
} 