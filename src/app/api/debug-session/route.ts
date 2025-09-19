import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth/config";
import { CustomDrizzleAdapter } from "../../../lib/auth/custom-adapter";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Debug Session - Starting...");
    console.log("🌍 Environment:", process.env.NODE_ENV);
    
    // Get all cookies
    const allCookies = request.cookies.getAll();
    console.log("🍪 All cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    
    // Try NextAuth session
    const nextAuthSession = await getServerSession(authOptions);
    console.log("🔍 NextAuth session:", nextAuthSession ? "Found" : "Not found");
    
    // Try custom validation
    const sessionToken = request.cookies.get("next-auth.session-token")?.value || 
                         request.cookies.get("__Secure-next-auth.session-token")?.value;
    
    let customSessionResult = null;
    if (sessionToken) {
      console.log("🔍 Found session token, validating...");
      const adapter = CustomDrizzleAdapter();
      const sessionAndUser = await adapter.getSessionAndUser!(sessionToken);
      
      if (sessionAndUser && sessionAndUser.session.expires > new Date()) {
        customSessionResult = {
          user: sessionAndUser.user,
          session: sessionAndUser.session,
          valid: true
        };
      } else {
        customSessionResult = {
          valid: false,
          reason: !sessionAndUser ? "Session not found" : "Session expired"
        };
      }
    }
    
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      cookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      nextAuthSession: nextAuthSession ? {
        hasUser: !!nextAuthSession.user,
        userId: nextAuthSession.user?.id,
        userEmail: nextAuthSession.user?.email
      } : null,
      customSession: customSessionResult,
      sessionToken: sessionToken ? sessionToken.substring(0, 20) + "..." : "Not found"
    });
    
  } catch (error) {
    console.error("❌ Debug session error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
