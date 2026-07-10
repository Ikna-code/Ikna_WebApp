import { NextResponse } from 'next/server';

import {
  markPaymentPending,
  markTimedOutCheckoutSessions,
  trackCheckoutStep,
} from '@/backend/services/customerCheckoutSession';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type CheckoutTrackingStep =
  | 'CHECKOUT_STARTED'
  | 'ADDRESS_ADDED'
  | 'SHIPPING_SELECTED'
  | 'PAYMENT_STARTED';

const VALID_STEPS = new Set<CheckoutTrackingStep>([
  'CHECKOUT_STARTED',
  'ADDRESS_ADDED',
  'SHIPPING_SELECTED',
  'PAYMENT_STARTED',
]);

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawStep = String(body?.step || '').trim().toUpperCase() as CheckoutTrackingStep;
  const note = typeof body?.note === 'string' ? body.note.trim() : undefined;

  if (!VALID_STEPS.has(rawStep)) {
    return NextResponse.json({ error: 'Invalid checkout tracking step.' }, { status: 400 });
  }

  try {
    await markTimedOutCheckoutSessions();

    if (rawStep === 'PAYMENT_STARTED') {
      await markPaymentPending(user.id, null);
    } else {
      await trackCheckoutStep(user.id, rawStep, note);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[checkout-session-track] failed', error);
    return NextResponse.json({ error: 'Failed to track checkout session.' }, { status: 500 });
  }
}