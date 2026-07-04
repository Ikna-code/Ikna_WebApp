import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { runPostPaymentFulfillment } from '@/backend/services/postPaymentFulfillment';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function getAuthorizedAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
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
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: dbUser, error: null };
}

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const { orderId } = await context.params;

  try {
    const result = await runPostPaymentFulfillment({
      orderId,
      source: 'admin-retry-shiprocket',
    });

    return NextResponse.json({
      success: Boolean(result.created),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Shiprocket fulfillment error';

    console.error('[admin-retry-shiprocket] Fulfillment failed.', {
      orderId,
      error: message,
      rawError: error,
    });

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
