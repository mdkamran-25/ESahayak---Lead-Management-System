import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log("🔍 Middleware: Path:", pathname);
  
  // Allow access to auth pages, API routes, and static files
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    console.log("✅ Middleware: Public path, allowing access");
    return NextResponse.next();
  }

  // Get session token from cookie (try both production and dev cookie names)
  const sessionToken = request.cookies.get("next-auth.session-token")?.value || 
                       request.cookies.get("__Secure-next-auth.session-token")?.value;
  
  console.log("🔍 Middleware: Checking cookies...");
  console.log("  - next-auth.session-token:", !!request.cookies.get("next-auth.session-token")?.value);
  console.log("  - __Secure-next-auth.session-token:", !!request.cookies.get("__Secure-next-auth.session-token")?.value);
  console.log("  - Selected token:", sessionToken ? sessionToken.substring(0, 20) + "..." : "none");
  
  if (!sessionToken) {
    console.log("❌ Middleware: No session cookie found");
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  console.log("🔍 Middleware: Session token found, allowing access");
  console.log("✅ Middleware: Session validation delegated to NextAuth");
  
  // If session cookie exists, allow access and let NextAuth handle validation
  // This avoids database calls in middleware (Edge Runtime limitations)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
