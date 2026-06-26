import { NextRequest, NextResponse } from 'next/server';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { uploadMedia } from '@/src/lib/cloudinary';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/', 'video/'];

export async function POST(request: NextRequest) {
  try {
    const dbUser = await ensureCurrentDbUser();

    if (!dbUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const productId = String(formData.get('productId') || '').trim();

    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json({ uploadedMedia: [], uploadedUrls: [] });
    }

    const uploadedMedia: Array<{ url: string; publicId: string; type: 'image' | 'video' }> = [];

    for (const file of files) {
      const mimeType = String(file.type || '').toLowerCase();
      const isAllowedType = ALLOWED_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

      if (!isAllowedType) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type || 'unknown'}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File exceeds max size of 20MB: ${file.name}` },
          { status: 400 }
        );
      }

      const type: 'image' | 'video' = mimeType.startsWith('video/') ? 'video' : 'image';
      const folder = productId
        ? `review_media/${productId}/${dbUser.id}`
        : `review_media/general/${dbUser.id}`;

      const uploaded = await uploadMedia(file, {
        folder,
        fileName: file.name,
        resourceType: 'auto',
      });

      uploadedMedia.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        type,
      });
    }

    return NextResponse.json({
      uploadedMedia,
      uploadedUrls: uploadedMedia.map((item) => item.url),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload review media' },
      { status: 500 }
    );
  }
}
