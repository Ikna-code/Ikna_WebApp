"use client";

import { useStore } from "@/store/useStore";

export default function GlobalSpinner() {
  const isLoading = useStore((state) => state.isLoading);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin"></div>
        </div>
        {/* Optional loading text */}
        <p className="text-sm font-medium text-gray-700">Processing...</p>
      </div>
    </div>
  );
}
