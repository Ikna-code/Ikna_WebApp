import { getSupabaseAdminClient } from '@/lib/supabase/server';

export function createSupabaseAdminClient() {
  return getSupabaseAdminClient();
}
