import { NextRequest, NextResponse } from 'next/server';

const SPRING_BOOT_API_URL = process.env.SPRING_BOOT_API_URL || 'http://localhost:8080';

async function handleProxy(req: NextRequest) {
  // Extract the path from the URL
  // e.g., /api/v1/auth/login -> /api/v1/auth/login
  const path = req.nextUrl.pathname.replace(/^\/api/, '');
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${SPRING_BOOT_API_URL}/api${path}${searchParams ? `?${searchParams}` : ''}`;

  // Forward request headers
  const headers = new Headers(req.headers);
  // Important: Remove the host header so the proxy request sets its own host
  headers.delete('host');

  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // If the request has a body, read it
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = JSON.stringify(await req.json());
    } else {
      body = await req.text();
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // Prevents fetch from automatically following redirects, 
      // allowing us to handle them manually if needed or pass them back.
      redirect: 'manual', 
    });

    // Create a new NextResponse based on the Spring Boot response
    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text();

    const nextResponse = new NextResponse(
      typeof data === 'string' ? data : JSON.stringify(data),
      {
        status: response.status,
        statusText: response.statusText,
      }
    );

    // Forward response headers
    response.headers.forEach((value, key) => {
      // Skip set-cookie here — we handle it separately below
      if (key.toLowerCase() !== 'set-cookie') {
        nextResponse.headers.set(key, value);
      }
    });

    // Crucially: forward ALL Set-Cookie headers individually.
    // headers.set() overwrites duplicates, so using getSetCookie() + append()
    // ensures both access_token and refresh_token cookies reach the browser.
    const setCookieHeaders = response.headers.getSetCookie();
    for (const cookie of setCookieHeaders) {
      nextResponse.headers.append('set-cookie', cookie);
    }

    return nextResponse;
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to proxy request to backend API' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function PATCH(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }
