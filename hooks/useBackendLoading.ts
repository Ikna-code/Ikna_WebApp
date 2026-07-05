"use client";

import { useStore } from "@/store/useStore";

/**
 * Hook to wrap async backend operations with global loading state
 * Usage:
 *   const { executeWithLoading } = useBackendLoading();
 *   await executeWithLoading(async () => {
 *     // Your API call here
 *     await fetch(...)
 *   })
 */
export function useBackendLoading() {
  const incrementLoadingCount = useStore(
    (state) => state.incrementLoadingCount
  );
  const decrementLoadingCount = useStore(
    (state) => state.decrementLoadingCount
  );

  const executeWithLoading = async <T,>(
    asyncFn: () => Promise<T>,
    options?: { showSpinner?: boolean }
  ): Promise<T> => {
    const showSpinner = options?.showSpinner !== false;

    if (showSpinner) {
      incrementLoadingCount();
    }

    try {
      const result = await asyncFn();
      return result;
    } finally {
      if (showSpinner) {
        decrementLoadingCount();
      }
    }
  };

  return {
    executeWithLoading,
    incrementLoadingCount,
    decrementLoadingCount,
  };
}
