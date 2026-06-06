import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { deleteImage } from '@/src/lib/cloudinary';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const dbUser = await ensureCurrentDbUser();
  if (!dbUser || dbUser.role !== Role.ADMIN) return null;
  return dbUser.id;
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const publicId = String(body?.publicId || '').trim();

    if (!publicId) {
      return NextResponse.json({ error: 'publicId is required' }, { status: 400 });
    }

    await deleteImage(publicId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}
