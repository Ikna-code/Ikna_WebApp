import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/backend/lib/supabaseAdmin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function validatePassword(password: string): string {
  if (!password) return 'New password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return '';
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const newPassword = String(body?.newPassword || '');
    const confirmPassword = String(body?.confirmPassword || '');

    const hasEmailProvider = (user.identities ?? []).some(
      (identity) => identity.provider === 'email'
    );

    if (!hasEmailProvider) {
      return NextResponse.json(
        { error: 'This account uses Google Sign-In only. No password can be set.' },
        { status: 403 }
      );
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (!confirmPassword || newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords must match.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('reset-password route error:', error);
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
  }
}
