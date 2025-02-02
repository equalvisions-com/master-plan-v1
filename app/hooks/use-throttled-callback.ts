import { useCallback, useRef } from 'react';

export function useThrottledCallback<P extends unknown[], R>(
  callback: (...args: P) => R,
  delay: number,
  deps: React.DependencyList = []
): (...args: P) => R {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback((...args: P): R => {
    const now = Date.now();

    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule the callback
    return new Promise<R>((resolve) => {
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        resolve(callback(...args));
      }, delay);
    }) as unknown as R;
  }, [callback, delay, ...deps]);
} 