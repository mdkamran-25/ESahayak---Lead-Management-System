import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow access to auth pages for everyone
    if (req.nextUrl.pathname.startsWith("/auth")) {
      return NextResponse.next();
    }

    // If user is not authenticated and trying to access protected routes, redirect to signin
    if (!req.nextauth.token && req.nextUrl.pathname !== "/") {
      const url = new URL("/auth/signin", req.url);
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without authentication
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true;
        }

        // Allow access to home page (will redirect in the page component)
        if (req.nextUrl.pathname === "/") {
          return true;
        }

        // Require authentication for all other pages
        return !!token;
      },
    },
  }
);

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
