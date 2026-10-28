import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url') || 'http://localhost:8080/actuator/health';

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({ status: res.ok ? 'UP' : 'DOWN' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'DOWN',
        error: error.message || 'Failed to reach API Gateway',
      },
      { status: 503 }
    );
  }
}
