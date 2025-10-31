import jwt from 'jsonwebtoken';

export interface AuthContext {
  userId: string;
  email: string;
  permissions: string[];
  name?: string;
  verified: boolean;
}

export function withAuth(handler: (request: Request, auth: AuthContext) => Promise<Response>) {
  return async (request: Request) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const payload = jwt.verify(token, process.env.GEOMAP_JWT_SECRET!) as AuthContext;
      
      if (!payload.verified || !payload.permissions.includes('edit')) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return await handler(request, payload);
    } catch (error) {
      console.error('Authentication failed:', error);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

export function getAuthContext(request: Request): AuthContext | null {
  try {
    const userId = request.headers.get('x-user-id');
    const email = request.headers.get('x-user-email');
    const name = request.headers.get('x-user-name');
    
    if (!userId || !email) {
      return null;
    }
    
    return {
      userId,
      email,
      name: name || undefined,
      permissions: ['read', 'edit'], // Set by middleware
      verified: true // Set by middleware
    };
  } catch {
    return null;
  }
}
