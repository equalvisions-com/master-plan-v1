import { useCallback, useRef, useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<Args extends any[], R>(
  callback: (...args: Args) => R,
  delay: number,
): (...args: Args) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
} 