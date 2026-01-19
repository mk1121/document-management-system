import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configure allowed origins (extend via CORS_ORIGINS env, comma-separated)
const defaultAllowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.154:3000',
  'https://fd.informatixsystems.com',
  'https://fd.informatixsystems.com:3000',
  'https://fd.informatixsystems.com:8443',
  'capacitor://localhost',
  'ionic://localhost',
]);

function getAllowedOrigin(origin: string | null): string {
  if (!origin) return '*';
  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowed = new Set<string>([...defaultAllowedOrigins, ...extra]);
  return allowed.has(origin) ? origin : '*';
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = getAllowedOrigin(origin);
  const isAllowed = allowedOrigin !== '*';

  // Preflight request
  if (request.method === 'OPTIONS') {
    if (!isAllowed) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        Vary: 'Origin',
      },
    });
  }

  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.append('Vary', 'Origin');
  return response;
}

// Apply only to API routes
export const config = {
  matcher: ['/api/:path*'],
};
