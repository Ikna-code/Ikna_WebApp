import { NextResponse } from 'next/server';

type ParsedBody = Record<string, FormDataEntryValue> | unknown;

async function parseIncomingBody(request: Request): Promise<ParsedBody> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  return null;
}

export async function POST(request: Request) {
  let body: ParsedBody = null;

  try {
    body = await parseIncomingBody(request);
  } catch {
    body = null;
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        'POST request accepted for OrderDashboard. Prefer posting directly to /api/admin/order-dashboard.',
      body,
    },
    { status: 200 }
  );
}
