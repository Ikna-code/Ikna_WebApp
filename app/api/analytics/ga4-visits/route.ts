import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';

const propertyId = process.env.GA4_PROPERTY_ID;
const clientEmail = process.env.GA4_CLIENT_EMAIL;
const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Fallback sample data when credentials are not configured
const fallbackData = {
  days: [
    { date: 'Mon', newUsers: 42, activeUsers: 118 },
    { date: 'Tue', newUsers: 57, activeUsers: 145 },
    { date: 'Wed', newUsers: 63, activeUsers: 160 },
    { date: 'Thu', newUsers: 81, activeUsers: 192 },
    { date: 'Fri', newUsers: 74, activeUsers: 176 },
    { date: 'Sat', newUsers: 52, activeUsers: 131 },
    { date: 'Sun', newUsers: 39, activeUsers: 104 },
  ],
  totals: { newUsers: 408, activeUsers: 1026 },
  source: 'sample',
};

export async function GET() {
  if (!propertyId || !clientEmail || !privateKey) {
    return NextResponse.json(fallbackData);
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'newUsers' }, { name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const days = (response.rows || []).map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      // rawDate format: YYYYMMDD
      const d = new Date(
        parseInt(rawDate.slice(0, 4)),
        parseInt(rawDate.slice(4, 6)) - 1,
        parseInt(rawDate.slice(6, 8))
      );
      return {
        date: dayNames[d.getDay()],
        newUsers: parseInt(row.metricValues?.[0]?.value || '0'),
        activeUsers: parseInt(row.metricValues?.[1]?.value || '0'),
      };
    });

    const totals = days.reduce(
      (acc, d) => ({
        newUsers: acc.newUsers + d.newUsers,
        activeUsers: acc.activeUsers + d.activeUsers,
      }),
      { newUsers: 0, activeUsers: 0 }
    );

    return NextResponse.json({ days, totals, source: 'ga4' });
  } catch (error) {
    console.error('GA4 API error:', error);
    return NextResponse.json(fallbackData);
  }
}
