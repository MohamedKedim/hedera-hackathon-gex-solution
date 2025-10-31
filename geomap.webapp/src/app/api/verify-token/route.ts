import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface AuthToken {
  userId: string;
  email: string;
  verified: boolean;
  permissions: string[];
  name?: string;
  type?: 'access' | 'refresh';
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const payload = jwt.verify(token, process.env.GEOMAP_JWT_SECRET!, {
      issuer: 'onboarding-app',
      audience: 'geomap-app'
    }) as AuthToken;

    // Ensure it's an access token
    if (payload.type && payload.type !== 'access') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      valid: true,
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        verified: payload.verified,
        permissions: payload.permissions
      }
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED',
        valid: false 
      }, { status: 401 });
    }
    return NextResponse.json({ error: 'Invalid token', valid: false }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
