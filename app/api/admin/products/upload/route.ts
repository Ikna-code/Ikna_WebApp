import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { uploadImage } from '@/src/lib/cloudinary';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const dbUser = await ensureCurrentDbUser();

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return null;
  }

  return dbUser.id;
}

const sanitizePathSegment = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_');

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const productId = String(formData.get('productId') || '').trim();
    const safeProductId = sanitizePathSegment(productId);

    if (!safeProductId) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json({ uploadedPaths: [] });
    }

    const relativePaths = formData.getAll('paths').map((item) => String(item || '').replace(/\\/g, '/'));
    const rootFolder = relativePaths.find((path) => path.includes('/'))?.split('/')[0] || '';

    const uploadedPaths: string[] = [];
    const uploadedImages: Array<{ url: string; publicId: string }> = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const relativePath = relativePaths[index] || file.name;
      const normalizedParts = relativePath.split('/').filter(Boolean);
      const trimmedParts = rootFolder && normalizedParts[0] === rootFolder
        ? normalizedParts.slice(1)
        : normalizedParts;

      const safeParts = trimmedParts.map((part) => sanitizePathSegment(part)).filter(Boolean);
      const safeFileName = safeParts[safeParts.length - 1] || sanitizePathSegment(file.name);
      const safeDirs = safeParts.slice(0, -1).join('/');

      const cloudinaryFileName = safeDirs
        ? `${safeDirs}/${safeFileName}`
        : safeFileName;

      const uploaded = await uploadImage(file, {
        productId: safeProductId,
        fileName: cloudinaryFileName,
      });

      uploadedPaths.push(uploaded.url);
      uploadedImages.push(uploaded);
    }

    return NextResponse.json({ uploadedPaths, uploadedImages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload images' },
      { status: 500 }
    );
  }
}
