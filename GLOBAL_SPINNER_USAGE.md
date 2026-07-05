# Global Loading Spinner - Usage Guide

This document explains how to use the global loading spinner for all backend API calls.

## Architecture

The global loading spinner system consists of:

1. **Loading Slice** (`store/createLoadingSlice.ts`) - Manages loading state in Zustand
2. **Global Spinner Component** (`components/ui/GlobalSpinner.tsx`) - The visual spinner
3. **Hook** (`hooks/useBackendLoading.ts`) - Easy wrapper for API calls
4. **Integration** - Already added to `app/layout.tsx`

## How It Works

- **Counter-based**: Uses a loading count to handle multiple simultaneous requests
- **Global State**: Spinner shows when ANY backend call is in progress
- **Automatic Cleanup**: Handles errors gracefully with try/finally

## Usage Patterns

### Pattern 1: Simple API Calls with Hook (Recommended)

```typescript
"use client";

import { useBackendLoading } from "@/hooks/useBackendLoading";

export function MyComponent() {
  const { executeWithLoading } = useBackendLoading();

  const handleFetch = async () => {
    await executeWithLoading(async () => {
      const response = await fetch("/api/some-endpoint", {
        method: "POST",
        body: JSON.stringify({ data: "value" }),
      });
      const data = await response.json();
      console.log("Success:", data);
    });
  };

  return <button onClick={handleFetch}>Fetch Data</button>;
}
```

### Pattern 2: Using Server Actions

```typescript
"use client";

import { useBackendLoading } from "@/hooks/useBackendLoading";
import { myServerAction } from "@/backend/actions/myAction";

export function MyComponent() {
  const { executeWithLoading } = useBackendLoading();

  const handleSubmit = async (formData) => {
    await executeWithLoading(async () => {
      const result = await myServerAction(formData);
      console.log("Result:", result);
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pattern 3: Manual Control (Advanced)

If you need more granular control:

```typescript
"use client";

import { useStore } from "@/store/useStore";

export function MyComponent() {
  const incrementLoadingCount = useStore((s) => s.incrementLoadingCount);
  const decrementLoadingCount = useStore((s) => s.decrementLoadingCount);

  const handleComplexOperation = async () => {
    // Start loading
    incrementLoadingCount();

    try {
      // Do something
      await fetch("/api/step1");
      // Do something else
      await fetch("/api/step2");
    } finally {
      // Stop loading
      decrementLoadingCount();
    }
  };

  return <button onClick={handleComplexOperation}>Process</button>;
}
```

### Pattern 4: Using with Fetch Interceptor (For ALL requests)

To automatically show spinner for ALL fetch calls, add this to `AppInitializer.tsx`:

```typescript
// Add this in AppInitializer useEffect or in a separate hook

useEffect(() => {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const { incrementLoadingCount, decrementLoadingCount } = useStore.getState();
    
    incrementLoadingCount();
    try {
      const response = await originalFetch(...args);
      return response;
    } finally {
      decrementLoadingCount();
    }
  };

  return () => {
    window.fetch = originalFetch;
  };
}, []);
```

## Customization

### Change Spinner Appearance

Edit `components/ui/GlobalSpinner.tsx`:

- Colors: Change `border-pink-500` to your color
- Size: Modify `w-16 h-16` for different sizes
- Text: Edit "Processing..." message
- Background: Adjust `bg-black/10` opacity

### Skip Spinner for Specific Calls

```typescript
const { executeWithLoading } = useBackendLoading();

// Don't show spinner
await executeWithLoading(async () => {
  await fetch("/api/silent-endpoint");
}, { showSpinner: false });
```

## Best Practices

1. **Always use executeWithLoading** for consistency
2. **Don't mix manual controls with hook** - choose one approach per component
3. **Test with slow network** in DevTools to ensure spinner appears
4. **Use for long operations** - spinners on <100ms requests may flicker

## Troubleshooting

### Spinner doesn't appear

1. Verify `GlobalSpinner` is in `app/layout.tsx`
2. Check browser DevTools → Elements for the spinner DOM
3. Ensure `useBackendLoading()` is being called from a client component

### Spinner stuck/never disappears

1. Check console for unhandled promise rejections
2. Ensure all paths call `decrementLoadingCount()` (use try/finally)
3. Verify `showSpinner: false` is not set unintentionally

### Multiple spinners showing

Won't happen - only one spinner per the design. Verify loading state in Redux DevTools.
