import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth/config";
import { authDb } from "../../../../lib/db";
import { sessions } from "../../../../lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get session token from cookies
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (sessionToken) {
      try {
        // Delete session from database
        await authDb
          .delete(sessions)
          .where(eq(sessions.sessionToken, sessionToken));
        console.log("Session deleted from database");
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    }

    // Clear all possible NextAuth cookies
    const response = NextResponse.json(
      { message: "Signed out successfully" },
      { status: 200 }
    );

    // List of all authentication cookies to clear
    const cookiesToClear = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.callback-url",
      "next-auth.pkce.code_verifier",
      "__Secure-next-auth.pkce.code_verifier",
      "session", // Custom session cookie (JWT) that might be leftover
    ];

    // Clear all known authentication cookies with multiple sameSite values to ensure clearing
    cookiesToClear.forEach((cookieName) => {
      console.log("🗑️ Clearing cookie:", cookieName);
      
      // Clear with different sameSite values to ensure we catch all variants
      const sameSiteValues = ["lax", "strict", "none"] as const;
      
      sameSiteValues.forEach((sameSite) => {
        response.cookies.set(cookieName, "", {
          expires: new Date(0),
          path: "/",
          httpOnly: cookieName !== "session", // session cookie might not be httpOnly
          secure: process.env.NODE_ENV === "production",
          sameSite: sameSite,
        });
      });
    });

    console.log("✅ All authentication cookies cleared");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
