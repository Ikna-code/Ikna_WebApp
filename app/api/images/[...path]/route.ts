import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizeSegments(segments: string[]) {
  return segments
    .map((segment) => String(segment || '').trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return NextResponse.json(
      { error: 'Cloudinary cloud name is not configured' },
      { status: 500 }
    );
  }

  const { path } = await params;
  const normalized = normalizeSegments(path || []);

  if (!normalized.length) {
    return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
  }

  const publicPath = normalized.join('/');
  const target = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicPath}`;

  return NextResponse.redirect(target, 307);
}
