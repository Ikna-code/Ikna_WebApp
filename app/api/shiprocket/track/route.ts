import { NextResponse } from 'next/server';
import { getShiprocketToken } from '@/backend/lib/shiprocket';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('id')?.trim();

    if (!shipmentId) {
      return NextResponse.json({ error: 'Missing shipment id' }, { status: 400 });
    }

    const token = await getShiprocketToken();
    const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch Shiprocket tracking details',
          status: res.status,
          response: data,
        },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown tracking error';
    console.error('[shiprocket-track] Request failed.', {
      error: message,
      rawError: error,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}