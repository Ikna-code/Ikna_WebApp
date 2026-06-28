import { NextRequest, NextResponse } from 'next/server';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { uploadMedia } from '@/src/lib/cloudinary';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const ALLOWED_IMAGE_PREFIX = 'image/';

const getFileExtension = (name: string) => {
  const normalized = String(name || '').trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  return dotIndex >= 0 ? normalized.slice(dotIndex + 1) : '';
};

const detectMediaType = (file: File): 'image' | 'video' | null => {
  const mimeType = String(file.type || '').toLowerCase();
  const extension = getFileExtension(file.name || '');

  if (mimeType.startsWith(ALLOWED_IMAGE_PREFIX)) {
    return 'image';
  }

  if (ALLOWED_VIDEO_MIME_TYPES.has(mimeType) && ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }

  if ((mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') && ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }

  return null;
};

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

    const uploadedMedia: Array<{ url: string; publicId: string; type: 'image' | 'video'; duration: number | null; thumbnailUrl: string | null }> = [];

    for (const file of files) {
      const detectedType = detectMediaType(file);
      if (!detectedType) {
        return NextResponse.json(
          { error: `Unsupported file type for ${file.name}. Allowed video formats: mp4, mov, webm (max 25MB).` },
          { status: 400 }
        );
      }

      const type: 'image' | 'video' = detectedType;
      const maxBytes = type === 'video' ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

      if (file.size > maxBytes) {
        const maxLabel = type === 'video' ? '25MB' : '5MB';
        return NextResponse.json(
          { error: `File exceeds max size of ${maxLabel}: ${file.name}` },
          { status: 400 }
        );
      }

      const folder = productId
        ? `reviews/videos/${productId}/${dbUser.id}`
        : `reviews/videos/general/${dbUser.id}`;

      const uploaded = await uploadMedia(file, {
        folder,
        fileName: file.name,
        resourceType: type,
      });

      const secureUrl = String(uploaded.url || '').trim();
      const publicId = String(uploaded.publicId || '').trim();
      if (!secureUrl.startsWith('https://') || !publicId) {
        return NextResponse.json(
          { error: `Invalid Cloudinary upload response for ${file.name}` },
          { status: 502 }
        );
      }

      uploadedMedia.push({
        url: secureUrl,
        publicId,
        type,
        duration: typeof uploaded.duration === 'number' ? uploaded.duration : null,
        thumbnailUrl: uploaded.thumbnailUrl ? String(uploaded.thumbnailUrl).trim() : null,
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
