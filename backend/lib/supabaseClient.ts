// import { createClient } from '@supabase/supabase-js'
// interface ImportMetaEnv {
//   readonly NEXT_PUBLIC_SUPABASE_URL: string
//   readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string
// }

// interface ImportMeta {
//   readonly env: ImportMetaEnv
// }

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)




// @/utils/supabase/client.ts
// import { createBrowserClient } from '@supabase/ssr'

// export function createClient() {
//   return createBrowserClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//   )
// }

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 1. FOR SERVER ACTIONS (File 1)
// This is a standard singleton instance for Node.js environments
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// 2. FOR CLIENT COMPONENTS (File 2)
// This uses the SSR package to safely handle browser-side auth and cookies
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}


