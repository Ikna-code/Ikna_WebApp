import { IMAGE_BASE_URL } from '@/public/constants/constants';

const PUBLIC_PREFIX = '/storage/v1/object/public/';
const RENDER_PREFIX = '/storage/v1/render/image/public/';
const LEGACY_OBJECT_PREFIX = '/storage/v1/object/products/';
const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type SupabaseImageOptions = {
  width?: number;
  quality?: number;
  format?: 'origin' | 'webp';
  resize?: 'cover' | 'contain' | 'fill';
  original?: boolean; // 1. Added option to request the unoptimized original file
};

function normalizePath(pathOrUrl: string) {
  return String(pathOrUrl || '')
    .replace(/\s+/g, '')
    .replace(/^\/+/, '');
}

function extractStoragePath(pathOrUrl: string) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return normalizePath(value);
  }

  try {
    const url = new URL(value);
    const markers = [
      '/image/upload/',
      '/storage/v1/object/public/products/',
      '/storage/v1/object/products/',
      '/storage/v1/render/image/public/products/',
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index >= 0) {
        const remainder = url.pathname.slice(index + marker.length);
        return normalizePath(remainder);
      }
    }
  } catch {
    return '';
  }

  return '';
}

function buildCloudinaryOptimizedUrl(pathOrUrl: string, options: SupabaseImageOptions) {
  try {
    if (!CLOUDINARY_CLOUD_NAME) return '';

    const storagePath = extractStoragePath(pathOrUrl);
    if (!storagePath) return '';

    const uploadIndex = storagePath.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
    const normalizedPath = uploadIndex >= 0
      ? storagePath.slice(uploadIndex + CLOUDINARY_UPLOAD_SEGMENT.length)
      : storagePath;

    if (options.original) {
      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${normalizedPath}`;
    }

    const { width, quality = 75, format = 'webp', resize = 'contain' } = options;
    const transforms: string[] = ['f_auto'];

    if (quality && Number.isFinite(quality)) {
      transforms.push(`q_${Math.max(1, Math.min(100, Math.floor(quality)))}`);
    } else {
      transforms.push('q_auto');
    }

    if (width && Number.isFinite(width)) {
      const crop = resize === 'contain' ? 'fit' : resize === 'fill' ? 'scale' : 'fill';
      transforms.push(`c_${crop}`, `w_${Math.max(1, Math.floor(width))}`);
    }

    if (format !== 'origin' && format !== 'webp') {
      transforms.push(`f_${format}`);
    }

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transforms.join(',')}/${normalizedPath}`;
  } catch {
    return '';
  }
}

export function getOptimizedSupabaseImageUrl(pathOrUrl: string | null | undefined, options: SupabaseImageOptions = {}) {
  if (!pathOrUrl) return '';

  const value = String(pathOrUrl).trim();
  if (!value) return '';
  const isAbsolute = value.startsWith('http://') || value.startsWith('https://');

  if (isAbsolute) {
    const cloudinaryUrl = buildCloudinaryOptimizedUrl(value, options);
    if (cloudinaryUrl) return cloudinaryUrl;
  } else {
    // Try to handle as Cloudinary public ID (relative path like product_photos/...)
    const cloudinaryUrl = buildCloudinaryOptimizedUrl(value, options);
    if (cloudinaryUrl) return cloudinaryUrl;
  }

  const baseCandidate = String(IMAGE_BASE_URL || '').trim();

  // If cloud image base is not configured yet, avoid constructing URL with an invalid base.
  if (!isAbsolute && !baseCandidate) {
    return `/api/images/${normalizePath(value)}`;
  }

  // Handle relative base URLs (like /api/images/)
  if (baseCandidate.startsWith('/')) {
    const base = baseCandidate.endsWith('/') ? baseCandidate : `${baseCandidate}/`;
    return `${base}${normalizePath(value)}`;
  }

  const base = baseCandidate.endsWith('/') ? baseCandidate : `${baseCandidate}/`;

  const url = isAbsolute
    ? new URL(value)
    : (() => {
        try {
          return new URL(normalizePath(value), base);
        } catch {
          return new URL(value.startsWith('/') ? value : `/${normalizePath(value)}`, 'http://localhost');
        }
      })();

  // Repair legacy malformed storage URLs: /storage/v1/object/products/... -> /storage/v1/object/public/products/...
  if (url.pathname.includes(LEGACY_OBJECT_PREFIX)) {
    url.pathname = url.pathname.replace(LEGACY_OBJECT_PREFIX, PUBLIC_PREFIX);
  }

  // 2. CRITICAL CHECK: If original is requested, skip transformation entirely
  if (options.original) {
    // If it accidentally got routed to the render path previously, change it back to object/public
    if (url.pathname.includes(RENDER_PREFIX)) {
      url.pathname = url.pathname.replace(RENDER_PREFIX, PUBLIC_PREFIX);
    }
    return url.toString();
  }

  // --- Optimization Logic (Runs only if original is NOT true) ---
  const { width, quality = 75, format = 'webp', resize = 'contain' } = options;

  if (url.pathname.includes(PUBLIC_PREFIX)) {
    url.pathname = url.pathname.replace(PUBLIC_PREFIX, RENDER_PREFIX);
  }

  if (width && Number.isFinite(width)) {
    url.searchParams.set('width', String(Math.max(1, Math.floor(width))));
    url.searchParams.set('resize', resize); 
  }

  if (quality && Number.isFinite(quality)) {
    url.searchParams.set('quality', String(Math.max(1, Math.min(100, Math.floor(quality)))));
  }

  if (format !== 'origin') {
    url.searchParams.set('format', format);
  }

  return url.toString();
}