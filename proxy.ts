import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (request.method === 'POST') {
    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = '/api/admin/order-dashboard';
    return NextResponse.rewrite(rewrittenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/Admin/OrderDashboard',
};
