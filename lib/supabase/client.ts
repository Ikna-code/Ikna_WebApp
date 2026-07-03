"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // Keep one browser auth client across HMR and React Strict Mode re-renders.
  // Without this singleton, multiple GoTrue clients can subscribe to the same
  // storage key and trigger undefined auth behavior.
  var __iknaSupabaseBrowserClient: SupabaseClient | undefined;
}

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() must only be called in the browser.");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env and restart the dev server."
    );
  }

  if (!globalThis.__iknaSupabaseBrowserClient) {
    globalThis.__iknaSupabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  browserClient = globalThis.__iknaSupabaseBrowserClient;
  return browserClient;
}

// Keep imports safe during SSR/prerender by deferring browser client access
// until a property is actually used in a browser runtime.
export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const client = getSupabaseBrowserClient() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, property, receiver);

    if (typeof value === "function") {
      return (value as Function).bind(client);
    }

    return value;
  },
}) as SupabaseClient;
