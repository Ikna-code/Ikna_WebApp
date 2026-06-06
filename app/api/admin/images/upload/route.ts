import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { uploadImage } from '@/src/lib/cloudinary';

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
    const productId = String(formData.get('productId') || '').trim();
    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json({ uploadedPaths: [], uploadedImages: [] });
    }

    const uploadedImages: Array<{ url: string; publicId: string }> = [];

    for (const file of files) {
      const uploaded = await uploadImage(file, {
        productId,
        fileName: file.name,
      });

      uploadedImages.push(uploaded);
    }

    return NextResponse.json({
      uploadedPaths: uploadedImages.map((item) => item.url),
      uploadedImages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload images' },
      { status: 500 }
    );
  }
}
