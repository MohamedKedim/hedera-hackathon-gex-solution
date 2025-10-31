import { NextRequest, NextResponse } from 'next/server';

interface AuthToken {
  userId: string;
  email: string;
  verified: boolean;
  permissions: string[];
  name?: string;
  exp?: number;
  type?: 'access' | 'refresh';
  iss?: string;
  aud?: string;
}

async function verifyJWT(token: string): Promise<AuthToken | null> {
  try {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Token is empty or invalid');
    }
    const secret = process.env.GEOMAP_JWT_SECRET!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid token format: expected 3 parts, got ${parts.length}.`);
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!isValid) throw new Error('Invalid signature');
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as AuthToken;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      const error = new Error('Token expired');
      (error as any).name = 'TokenExpiredError';
      throw error;
    }
    if (payload.iss !== 'onboarding-app' || payload.aud !== 'geomap-app') {
      throw new Error('Invalid issuer or audience');
    }
    if (payload.type && payload.type !== 'access') {
      throw new Error(`Invalid token type: expected 'access', got '${payload.type}'`);
    }
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    if ((error as any).name === 'TokenExpiredError') throw error;
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const getAuthRedirectUrl = (reason?: string) => {
    const onboardingUrl = process.env.ONBOARDING_APP_URL;
    const geomapUrl = process.env.NEXT_PUBLIC_GEOMAP_URL;
    if (!onboardingUrl || !onboardingUrl.startsWith('http')) return null;
    const currentPageUrl = geomapUrl ? `${geomapUrl}${pathname}${search}` : request.url;
    const authUrl = new URL('/auth/authenticate', onboardingUrl);
    authUrl.searchParams.set('redirect', currentPageUrl);
    if (reason) authUrl.searchParams.set('reason', reason);
    return authUrl.toString();
  };

  const referer = request.headers.get('referer');
  if (referer && referer.startsWith(process.env.ONBOARDING_APP_URL || 'http://localhost:3000')) {
    return NextResponse.next();
  }

  let token =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.cookies.get('geomap-auth-token')?.value ||
    request.nextUrl.searchParams.get('token');

  if (token === 'null' || token === 'undefined') {
    token = null;
  }

  // --- 🟢 Allow public API routes (no auth needed) ---
  if (pathname.startsWith('/api/ports') || pathname.startsWith('/api/leafletmap')) {
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const authUrl = getAuthRedirectUrl();
    return authUrl ? NextResponse.redirect(authUrl) : NextResponse.next();
  }

  try {
    const payload = await verifyJWT(token);

    if (!payload || !payload.verified || !payload.permissions.includes('edit')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      const authUrl = getAuthRedirectUrl();
      return authUrl ? NextResponse.redirect(authUrl) : NextResponse.next();
    }

    if (pathname.startsWith('/admin')) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      if (!adminEmails.includes(payload.email)) {
        if (pathname.startsWith('/api/admin')) {
          return NextResponse.json({ error: 'Admin access restricted' }, { status: 403 });
        }
        const unauthorizedUrl = new URL('/unauthorized', request.url);
        return NextResponse.rewrite(unauthorizedUrl);
      }
    }

    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-email', payload.email);
    response.headers.set('x-user-name', payload.name || '');
    return response;

  } catch (error) {
    const isTokenExpired = (error as any).name === 'TokenExpiredError';
    if (pathname.startsWith('/api/')) {
      const body = isTokenExpired
        ? { error: 'Token expired', code: 'TOKEN_EXPIRED' }
        : { error: 'Invalid token' };
      return NextResponse.json(body, { status: 401 });
    }
    const reason = isTokenExpired ? 'token_expired' : 'invalid_token';
    const authUrl = getAuthRedirectUrl(reason);
    return authUrl ? NextResponse.redirect(authUrl) : NextResponse.next();
  }
}

export const config = {
  matcher: [
    //'/api/ccus/:path*',
    //'/api/production/:path*',
    //'/api/storage/:path*',
    // ❌ removed '/api/ports'
    '/api/plant-form/:path*',
    '/plant-form/:path*',
    '/port-form/:path*',
    '/admin/:path*',
    '/api/admin/:path*'
  ]
};
