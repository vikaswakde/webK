import { NextRequest, NextResponse } from 'next/server';

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function middleware(request: NextRequest) {
  // The browser sends a preflight OPTIONS request to check if the actual request is safe to send.
  if (request.method === 'OPTIONS') {
    // In a real application, you would want to check the `origin` header
    // and only allow requests from your extension's ID.
    // For development, we can allow any origin.
    const response = new NextResponse(null, { status: 204 }); // 204 No Content
    response.headers.set('Access-Control-Allow-Origin', '*');
    Object.entries(corsOptions).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Handle the actual request (e.g., POST)
  const response = NextResponse.next();

  // Also add the CORS headers to the actual response
  response.headers.set('Access-Control-Allow-Origin', '*');
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
