import 'server-only';

import { createHash } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

type CloudinaryUploadInput = File | Buffer | Uint8Array | ArrayBuffer;

type UploadImageResult = {
  url: string;
  publicId: string;
};

type UploadResourceType = 'image' | 'raw' | 'video' | 'auto';

const ensureCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Missing Cloudinary env vars. Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
};

const toBuffer = async (input: CloudinaryUploadInput) => {
  if (input instanceof Buffer) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  return Buffer.from(await input.arrayBuffer());
};

const sanitizePathSegment = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_');

const toDeterministicFilePath = (value: string) => {
  const normalized = String(value || '').trim().replace(/\\/g, '/');
  const segments = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => sanitizePathSegment(segment))
    .filter(Boolean);

  if (!segments.length) return '';

  const lastIndex = segments.length - 1;
  const withoutExtension = segments[lastIndex].replace(/\.[^.]+$/, '');
  segments[lastIndex] = withoutExtension || segments[lastIndex];

  return segments.join('/');
};

const uploadBuffer = async (
  buffer: Buffer,
  options: {
    publicId?: string;
    folder?: string;
    overwrite?: boolean;
    invalidate?: boolean;
    resourceType?: 'image' | 'raw' | 'video' | 'auto';
  } = {}
): Promise<UploadImageResult> => {
  ensureCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        overwrite: options.overwrite,
        invalidate: options.invalidate,
        resource_type: options.resourceType || 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
};

export async function uploadImage(
  file: CloudinaryUploadInput,
  options: {
    productId?: string;
    fileName?: string;
    folder?: string;
  } = {}
) {
  return uploadMedia(file, {
    ...options,
    resourceType: 'image',
  });
}

export async function uploadMedia(
  file: CloudinaryUploadInput,
  options: {
    productId?: string;
    fileName?: string;
    folder?: string;
    resourceType?: UploadResourceType;
  } = {}
) {
  const buffer = await toBuffer(file);
  const folder = options.folder || (options.productId ? `product_photos/${options.productId}` : 'product_photos');
  const safeFileName = toDeterministicFilePath(options.fileName || '');
  const bufferHash = createHash('sha1').update(buffer).digest('hex').slice(0, 16);

  const publicId = `${folder}/${safeFileName || bufferHash}`.replace(/\/+/g, '/');

  return uploadBuffer(buffer, {
    publicId,
    overwrite: true,
    invalidate: true,
    resourceType: options.resourceType || 'auto',
  });
}

export async function deleteImage(publicId: string) {
  ensureCloudinaryConfig();
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: false,
  });
}

export async function replaceImage(publicId: string, file: CloudinaryUploadInput) {
  const buffer = await toBuffer(file);
  return uploadBuffer(buffer, {
    publicId,
    overwrite: true,
    invalidate: true,
  });
}

export function generateOptimizedUrl(publicId: string) {
  ensureCloudinaryConfig();
  if (!publicId) return '';

  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
  });
}

export function extractCloudinaryPublicId(pathOrUrl: string) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';
  if (!value.startsWith('http://') && !value.startsWith('https://')) return value;

  try {
    const url = new URL(value);
    if (url.hostname !== 'res.cloudinary.com') return '';

    const parts = url.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex < 0 || uploadIndex + 1 >= parts.length) return '';

    const tail = parts.slice(uploadIndex + 1);

    while (tail.length && (tail[0].includes(',') || tail[0].includes(':'))) {
      tail.shift();
    }

    if (tail[0] && /^v\d+$/.test(tail[0])) {
      tail.shift();
    }

    if (!tail.length) return '';

    const publicIdWithExt = tail.join('/');
    const dotIndex = publicIdWithExt.lastIndexOf('.');
    return dotIndex > 0 ? publicIdWithExt.slice(0, dotIndex) : publicIdWithExt;
  } catch {
    return '';
  }
}