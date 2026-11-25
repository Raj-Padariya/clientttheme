'use client';

import { useCallback, useEffect, useState } from 'react';

export interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  /** True while a request is in flight, including a refetch that keeps the previous data on screen. */
  isFetching: boolean;
  refetch: () => void;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stand-in for a real API query; `resolve` must be a stable (module-level) function. */
export function useMockQuery<T>(resolve: () => T, delayMs = 400): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isFetching, setIsFetching] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setData(resolve());
      setIsFetching(false);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [resolve, delayMs, version]);

  const refetch = useCallback(() => {
    setIsFetching(true);
    setVersion((current) => current + 1);
  }, []);

  return { data, isLoading: data === undefined, isFetching, refetch };
}
