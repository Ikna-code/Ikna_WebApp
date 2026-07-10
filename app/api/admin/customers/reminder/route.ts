import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { emailService } from '@/backend/services/email';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/backend/lib/db';

async function getAuthorizedAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let dbUser = await db.user.findUnique({ where: { id: user.id } });

  if (!dbUser && process.env.NODE_ENV !== 'production') {
    dbUser = await db.user.create({
      data: {
        id: user.id,
        email: user.email ?? '',
        role: Role.ADMIN,
      },
    });
  }

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { error: null };
}

export async function POST(request: Request) {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || '').trim();
  const customerName = String(body?.customerName || '').trim();
  const cartValue = Number(body?.cartValue || 0);
  const cartUrl = String(body?.cartUrl || '').trim();

  if (!email) {
    return NextResponse.json({ error: 'Customer email is required.' }, { status: 400 });
  }

  const result = await emailService.sendAbandonedCartReminder(email, {
    customerName,
    cartValue,
    cartUrl,
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to send reminder email.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
