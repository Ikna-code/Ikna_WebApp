import { Role } from '@prisma/client';
import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/backend/lib/supabaseServer';

export async function ensureCurrentDbUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const role = process.env.NODE_ENV === 'production' ? Role.USER : Role.ADMIN;

  return db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? '',
      role,
    },
    update: {
      email: user.email ?? '',
      role,
    },
  });
}
