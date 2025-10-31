import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    // Forward the refresh request to the onboarding app
    const onboardingUrl = process.env.ONBOARDING_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${onboardingUrl}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Refresh failed' }));
      return NextResponse.json(errorData, { status: response.status });
    }
  } catch (error) {
    console.error('Token refresh proxy failed:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}
