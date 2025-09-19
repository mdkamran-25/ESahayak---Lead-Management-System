import { NextRequest, NextResponse } from "next/server";
import { authDb } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { CustomDrizzleAdapter } from "@/lib/auth/custom-adapter";

// Simple in-memory token store (in production, use Redis or database table)
const customTokenStore = new Map<string, {
  email: string;
  name?: string;
  expires: Date;
  used: boolean;
}>();

// Clean up expired tokens
const cleanupExpiredTokens = () => {
  const now = new Date();
  for (const [token, data] of customTokenStore.entries()) {
    if (now > data.expires || data.used) {
      customTokenStore.delete(token);
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("🔧 Creating custom verification token for:", email, name ? `(${name})` : "");

    // Clean up expired tokens
    cleanupExpiredTokens();

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in our custom store
    customTokenStore.set(token, {
      email,
      name,
      expires,
      used: false
    });

    console.log("✅ Custom token created:", token.substring(0, 20) + "...");

    return NextResponse.json({
      success: true,
      token,
      expires
    });

  } catch (error) {
    console.error("❌ Error creating custom token:", error);
    return NextResponse.json(
      { error: "Failed to create verification token" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");
    const callbackUrl = url.searchParams.get("callbackUrl") || "/buyers";

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 }
      );
    }

    console.log("🔍 Verifying custom token for:", email);
    console.log("🔍 Token:", token.substring(0, 20) + "...");

    // Clean up expired tokens
    cleanupExpiredTokens();

    // Check if token exists and is valid
    const tokenData = customTokenStore.get(token);

    if (!tokenData) {
      console.log("❌ Custom token not found");
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    if (tokenData.email !== email) {
      console.log("❌ Token email mismatch");
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    if (new Date() > tokenData.expires) {
      console.log("❌ Custom token expired");
      customTokenStore.delete(token);
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    if (tokenData.used) {
      console.log("❌ Custom token already used");
      return NextResponse.json(
        { error: "Verification token has already been used" },
        { status: 400 }
      );
    }

    // Mark token as used
    tokenData.used = true;
    console.log("✅ Custom token validated");

    // Find or create user
    let [user] = await authDb
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log("🔧 Creating new user:", email);
      const newUser = {
        id: uuidv4(),
        name: tokenData.name || null,
        email: email,
        emailVerified: new Date(),
        image: null,
      };

      [user] = await authDb
        .insert(users)
        .values(newUser)
        .returning();
      
      console.log("✅ User created:", user.email, tokenData.name ? `with name: ${tokenData.name}` : "");
    } else {
      // Update email verification
      [user] = await authDb
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      
      console.log("✅ User email verified:", user.email);
    }

    // Create a session using the adapter (ensures proper NextAuth compatibility)
    const adapter = CustomDrizzleAdapter();
    const sessionToken = uuidv4();
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await adapter.createSession!({
      sessionToken,
      userId: user.id,
      expires: sessionExpires,
    });
    
    console.log("🔐 Session created for user:", user.email, "with token:", sessionToken.substring(0, 20) + "...");

    // Clean up the used token
    customTokenStore.delete(token);

    // Set session cookie and return success
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      callbackUrl,
    });

    // Set NextAuth session cookie (different names for dev vs prod)
    const cookieName = process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token";
    
    response.cookies.set(cookieName, sessionToken, {
      expires: sessionExpires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    
    console.log("🍪 Session cookie set:", cookieName, "for user:", user.email);
    console.log("🔗 Callback URL:", callbackUrl);

    console.log("✅ Custom authentication complete for:", user.email);
    return response;

  } catch (error) {
    console.error("❌ Custom verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
