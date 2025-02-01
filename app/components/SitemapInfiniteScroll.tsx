import React, { useCallback, useEffect } from 'react';
import { debounce } from 'lodash';

const SCROLL_THRESHOLD = 400;
const DEBOUNCE_DELAY = 500;

const handleScroll = useCallback(() => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollHeight - (scrollTop + clientHeight) < window.innerHeight) {
    loadMore();
  }
}, [loadMore]);

useEffect(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [handleScroll]); 