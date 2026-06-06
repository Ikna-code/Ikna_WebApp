import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { replaceImage } from '@/src/lib/cloudinary';

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
    const formData = await request.formData();
    const publicId = String(formData.get('publicId') || '').trim();
    const file = formData.get('file');

    if (!publicId || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'publicId and file are required' },
        { status: 400 }
      );
    }

    const uploaded = await replaceImage(publicId, file);
    return NextResponse.json(uploaded);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to replace image' },
      { status: 500 }
    );
  }
}
