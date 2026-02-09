import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  const cspDirectives = [
    "default-src 'self'",
    // Allow inline scripts/styles for wallet adapters and Next.js
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    // Allow connections to RPC endpoints and wallet APIs
    "connect-src 'self' https://*.helius.xyz https://*.solana.com wss://*.solana.com https://api.mainnet-beta.solana.com",
    // Allow wallet adapter images
    "img-src 'self' data: https:",
    // Frame ancestors - prevent clickjacking
    "frame-ancestors 'none'",
    // Form submissions only to self
    "form-action 'self'",
    // Upgrade insecure requests
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspDirectives);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
