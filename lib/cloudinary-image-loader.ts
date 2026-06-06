/**
 * Custom Next.js image loader.
 *
 * Cloudinary URLs: already carry all transforms (f_auto, q_auto, c_fit, w_xxx)
 * applied by getOptimizedSupabaseImageUrl. We return them as-is so the browser
 * fetches directly from Cloudinary CDN — no /_next/image proxy, zero server load.
 *
 * Local/relative URLs (/images/...): fall through to the built-in Next.js optimizer.
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const requestedWidth = Number.isFinite(width) && width > 0 ? Math.floor(width) : 0;

  // Cloudinary URLs — serve directly from CDN and update width transform
  // so Next.js knows the custom loader respects the requested width.
  if (src.includes('res.cloudinary.com') && requestedWidth > 0) {
    try {
      const url = new URL(src);
      const marker = '/image/upload/';
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex < 0) return src;

      const before = url.pathname.slice(0, markerIndex + marker.length);
      const after = url.pathname.slice(markerIndex + marker.length);
      const segments = after.split('/').filter(Boolean);
      if (!segments.length) return src;

      const first = segments[0];
      const hasTransforms = first.includes(',') || /^([a-z]+_[^/]+)$/.test(first);
      const transforms = hasTransforms ? first.split(',').filter(Boolean) : [];

      // Remove existing width transform and apply the requested width.
      const nextTransforms = transforms.filter((token) => !/^w_\d+$/.test(token));
      nextTransforms.push(`w_${requestedWidth}`);

      const publicPath = hasTransforms ? segments.slice(1).join('/') : segments.join('/');
      url.pathname = `${before}${nextTransforms.join(',')}/${publicPath}`;

      if (quality && Number.isFinite(quality)) {
        url.searchParams.set('q', String(Math.max(1, Math.min(100, Math.floor(quality)))));
      }

      return url.toString();
    } catch {
      return src;
    }
  }

  // Local static assets and non-Cloudinary URLs should be used as-is.
  return src;
}
