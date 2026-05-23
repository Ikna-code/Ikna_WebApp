// src/backend/lib/supabaseServer.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  // 1. Await the cookies() function call
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // 2. Safely call .getAll() on the resolved cookies object
          return cookieStore.getAll();
        },
        setAll() {
          // No-op required for server-side
        },
      },
    }
  );
}