import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // Keep one non-request server client instance for shared server-side reads.
  var __iknaSupabaseServerClient: SupabaseClient | undefined;
  // Keep one service-role admin client across server module reloads.
  var __iknaSupabaseAdminClient: SupabaseClient | undefined;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // In some server contexts (e.g. Server Components), cookie writes are not allowed.
        }
      },
    },
  });
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!globalThis.__iknaSupabaseServerClient) {
    globalThis.__iknaSupabaseServerClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return globalThis.__iknaSupabaseServerClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (globalThis.__iknaSupabaseAdminClient) {
    return globalThis.__iknaSupabaseAdminClient;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars. Required SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE)."
    );
  }

  globalThis.__iknaSupabaseAdminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return globalThis.__iknaSupabaseAdminClient;
}
