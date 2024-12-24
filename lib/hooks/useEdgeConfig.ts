'use client';

import { useEffect, useState } from 'react';

export function useEdgeConfig<T>(key: string): T | undefined {
  const [config, setConfig] = useState<T>();

  useEffect(() => {
    const headerValue = document.querySelector(`meta[name="edge-config-${key}"]`)?.getAttribute('content');
    if (headerValue) {
      try {
        setConfig(JSON.parse(headerValue));
      } catch (error) {
        console.error(`Error parsing edge config for ${key}:`, error);
      }
    }
  }, [key]);

  return config;
} 