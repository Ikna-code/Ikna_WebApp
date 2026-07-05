"use client";

import { useState } from "react";
import { useBackendLoading } from "@/hooks/useBackendLoading";

/**
 * Example Component - Shows how to use the global loading spinner
 * This is a reference implementation - you can delete this file after using it
 */
export default function LoadingSpinnerExample() {
  const { executeWithLoading } = useBackendLoading();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimpleAPI = async () => {
    setError(null);
    await executeWithLoading(async () => {
      try {
        // Simulating an API call with delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setResult("✓ Simple API call completed!");
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleServerAction = async () => {
    setError(null);
    await executeWithLoading(async () => {
      try {
        // Simulating a server action with delay
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setResult("✓ Server action completed!");
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleSilentOperation = async () => {
    setError(null);
    await executeWithLoading(
      async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setResult("✓ Silent operation (no spinner) completed!");
        } catch (err: any) {
          setError(err.message);
        }
      },
      { showSpinner: false }
    );
  };

  const handleMultipleOperations = async () => {
    setError(null);
    await executeWithLoading(async () => {
      try {
        // First operation
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Second operation (spinner stays visible)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        setResult("✓ Multiple operations completed!");
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Global Loading Spinner Examples</h1>

      <div className="space-y-4">
        <button
          onClick={handleSimpleAPI}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Simple API Call (2s)
        </button>

        <button
          onClick={handleServerAction}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Server Action (3s)
        </button>

        <button
          onClick={handleSilentOperation}
          className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
        >
          Silent Operation - No Spinner (1s)
        </button>

        <button
          onClick={handleMultipleOperations}
          className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
        >
          Multiple Operations (2s total)
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-lg border border-green-300">
          {result}
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300">
          Error: {error}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="font-semibold mb-2">How to Use:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Import the hook: <code className="bg-gray-100 px-1 rounded">useBackendLoading</code></li>
          <li>Call <code className="bg-gray-100 px-1 rounded">executeWithLoading</code> with your async function</li>
          <li>The global spinner will automatically appear and disappear</li>
          <li>Works with multiple simultaneous requests</li>
          <li>Handles errors gracefully with try/finally</li>
        </ol>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
        <p className="text-gray-600">
          <strong>Note:</strong> Delete this file after understanding how to use the spinner.
          Check <code>GLOBAL_SPINNER_USAGE.md</code> for more usage patterns.
        </p>
      </div>
    </div>
  );
}
