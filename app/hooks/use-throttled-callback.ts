import { useCallback, useRef } from 'react';

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback((...args: Parameters<T>) => {
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
    return new Promise<ReturnType<T>>((resolve) => {
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        resolve(callback(...args));
      }, delay);
    });
  }, [...deps, delay]) as T;
} 