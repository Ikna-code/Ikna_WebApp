import { IMAGE_BASE_URL } from '@/public/constants/constants';

const PUBLIC_PREFIX = '/storage/v1/object/public/';
const RENDER_PREFIX = '/storage/v1/render/image/public/';

type SupabaseImageOptions = {
  width?: number;
  quality?: number;
  format?: 'origin' | 'webp';
  resize?: 'cover' | 'contain' | 'fill';
  original?: boolean; // 1. Added option to request the unoptimized original file
};

function normalizePath(pathOrUrl: string) {
  return pathOrUrl.replace(/^\/+/, '');
}

export function getOptimizedSupabaseImageUrl(pathOrUrl: string | null | undefined, options: SupabaseImageOptions = {}) {
  if (!pathOrUrl) return '';

  const value = String(pathOrUrl).trim();
  if (!value) return '';

  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL : `${IMAGE_BASE_URL}/`;
  const url = value.startsWith('http://') || value.startsWith('https://')
    ? new URL(value)
    : new URL(normalizePath(value), base);

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