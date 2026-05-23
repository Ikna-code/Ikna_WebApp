import { NextResponse } from 'next/server';
import { getShiprocketToken } from '@/backend/lib/shiprocket';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shipmentId = searchParams.get('id');
  
  const token = await getShiprocketToken();
  const res = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  return NextResponse.json(data);
}