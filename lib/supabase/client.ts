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

  if (!globalThis.__iknaSupabaseBrowserClient) {
    globalThis.__iknaSupabaseBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  browserClient = globalThis.__iknaSupabaseBrowserClient;
  return browserClient;
}

export const supabaseBrowser = getSupabaseBrowserClient();
