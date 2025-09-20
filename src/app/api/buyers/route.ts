import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth/config";
import { db, authDb } from "../../../lib/db";
import { buyers, buyerHistory, users, sessions } from "../../../lib/db/schema";
import { CustomDrizzleAdapter } from "../../../lib/auth/custom-adapter";
import {
  createBuyerSchema,
  buyerFiltersSchema,
} from "../../../lib/validations/buyer";
import { eq, and, or, ilike, desc, asc, sql, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  checkRateLimit,
  buyerMutationRateLimiter,
  apiRateLimiter,
} from "../../../lib/rate-limit";

// Custom session validation function
async function getCustomSession(request: NextRequest) {
  try {
    console.log("🔍 Starting session validation...");
    console.log("🌍 Environment:", process.env.NODE_ENV);
    
    // Skip NextAuth getServerSession in API routes as it doesn't work reliably
    // Go directly to custom validation
    console.log("🔍 Using custom session validation for API route...");
    
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log("🍪 All cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    
    // Fallback: manually validate session cookie using our adapter
    const sessionToken = request.cookies.get("next-auth.session-token")?.value || 
                         request.cookies.get("__Secure-next-auth.session-token")?.value;
    
    console.log("🔍 Custom session - checking cookies:");
    console.log("  - next-auth.session-token:", !!request.cookies.get("next-auth.session-token")?.value);
    console.log("  - __Secure-next-auth.session-token:", !!request.cookies.get("__Secure-next-auth.session-token")?.value);
    console.log("  - Selected token:", sessionToken ? sessionToken.substring(0, 20) + "..." : "NONE");
    
    if (!sessionToken) {
      console.log("❌ No session cookie found - authentication failed");
      return null;
    }

    console.log("🔍 Found session token, validating with adapter...");

    // Use our custom adapter to validate the session
    const adapter = CustomDrizzleAdapter();
    const sessionAndUser = await adapter.getSessionAndUser!(sessionToken);
    
    const now = new Date();
    console.log("🔍 Adapter result:", {
      found: !!sessionAndUser,
      expired: sessionAndUser ? sessionAndUser.session.expires < now : "N/A",
      expiresAt: sessionAndUser?.session.expires?.toISOString() || "N/A",
      currentTime: now.toISOString(),
      user: sessionAndUser?.user?.email || "N/A",
      userId: sessionAndUser?.user?.id || "N/A"
    });
    
    if (!sessionAndUser) {
      console.log("❌ Session not found in database");
      return null;
    }
    
    if (sessionAndUser.session.expires < now) {
      console.log("❌ Session expired");
      console.log("  - Session expires:", sessionAndUser.session.expires.toISOString());
      console.log("  - Current time:", now.toISOString());
      return null;
    }

    console.log("✅ Custom session validation successful:", sessionAndUser.user.email);
    
    // Return in NextAuth format
    return {
      user: {
        id: sessionAndUser.user.id,
        name: sessionAndUser.user.name,
        email: sessionAndUser.user.email,
        image: sessionAndUser.user.image,
      },
      expires: sessionAndUser.session.expires.toISOString(),
    };
  } catch (error) {
    console.error("❌ Session validation error:", error);
    return null;
  }
}

// Helper function to ensure user exists with retry logic
async function ensureUserExists(
  userId: string,
  email: string | null | undefined,
  name: string | null | undefined,
  image: string | null | undefined
) {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}: Checking if user exists...`);

    const existingUser = await authDb
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("User found in database");
      return;
    }

    console.log("❌ User not found in database! This indicates a session/database mismatch.");
    console.log("Session User ID:", userId);
    console.log("Session Email:", email);
    
    // Check if user exists by email (different ID)
    if (email) {
      console.log("🔍 Searching for user by email...");
      const userByEmail = await authDb
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
        
      if (userByEmail.length > 0) {
        console.log("🔍 Found user by email with ID:", userByEmail[0].id);
        console.log("❌ Session user ID doesn't match database user ID!");
        throw new Error(`Session user ID mismatch. Session: ${userId}, Database: ${userByEmail[0].id}`);
      }
    }

    console.log("User not found by email either, creating user...");
    try {
      await authDb.insert(users).values({
        id: userId,
        email: email || "",
        name: name || null,
        image: image || null,
        emailVerified: new Date(), // Add email verification
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ User created successfully");
      return;
    } catch (userCreateError: any) {
      console.error(
        `❌ User creation attempt ${attempts} failed:`,
        userCreateError
      );
      
      // Check if it's a unique constraint violation (user already exists)
      if (userCreateError.message?.includes('duplicate key') || userCreateError.message?.includes('unique constraint')) {
        console.log("✅ User already exists (race condition), continuing...");
        return;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error("Failed to create user after multiple attempts: " + userCreateError.message);
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit for buyer mutations
    const rateLimitResponse = await checkRateLimit(
      request,
      buyerMutationRateLimiter
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getCustomSession(request);

    if (!session?.user?.id) {
      console.log("❌ No session or user ID found");
      console.log("❌ Session object:", session);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Session user ID:", session.user.id);
    console.log("✅ Session user email:", session.user.email);
    console.log("✅ Full session object:", JSON.stringify(session, null, 2));

    // FORCE RECOMPILATION - Find the actual user in database and resolve any ID mismatches
    let actualUserId = session.user.id;
    
    // Check if session user ID exists in database
    let [userInDb] = await authDb
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userInDb && session.user.email) {
      console.log("🔍 Session user ID not found, searching by email...");
      // If not found by ID, try to find by email (potential ID mismatch)
      [userInDb] = await authDb
        .select()
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);
        
      if (userInDb) {
        console.log("✅ Found user by email with different ID:", userInDb.id);
        actualUserId = userInDb.id; // Use the actual database user ID
      }
    }

    if (!userInDb) {
      console.log("❌ User not found in database, creating user...");
      // Create user if doesn't exist
      try {
        await ensureUserExists(
          session.user.id,
          session.user.email,
          session.user.name,
          session.user.image
        );
        actualUserId = session.user.id;
      } catch (userError: any) {
        console.error("Failed to ensure user exists:", userError);
        return NextResponse.json(
          { error: "Failed to initialize user account: " + userError.message },
          { status: 500 }
        );
      }
    }

    console.log("✅ Using user ID for buyer creation:", actualUserId);

    // Ensure user exists in main database (sync from auth db if needed)
    console.log("🔧 Ensuring user exists in main database...");
    
    // Check if user exists in main database using the resolved actualUserId
    const [mainUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, actualUserId))
      .limit(1);

    if (!mainUser) {
      console.log("🔧 User not found in main db, syncing from auth db...");
      
      // Get the user from auth db to sync
      let userToSync = userInDb;
      if (!userToSync) {
        console.log("🔍 Getting user from auth db for sync...");
        [userToSync] = await authDb
          .select()
          .from(users)
          .where(eq(users.id, actualUserId))
          .limit(1);
      }
      
      if (!userToSync) {
        console.error("❌ User not found in auth db either - this should not happen");
        return NextResponse.json(
          { error: "User account not found - please sign in again" },
          { status: 401 }
        );
      }
      
      try {
        await db.insert(users).values({
          id: userToSync.id,
          email: userToSync.email,
          name: userToSync.name,
          image: userToSync.image,
          emailVerified: userToSync.emailVerified,
          createdAt: userToSync.createdAt,
          updatedAt: userToSync.updatedAt,
        });
        console.log("✅ User synced to main db successfully");
      } catch (mainDbError: any) {
        console.error("❌ Failed to sync user to main db:", mainDbError);
        
        // Check if it's a duplicate key error (race condition)
        if (mainDbError.message?.includes('duplicate key') || mainDbError.message?.includes('unique constraint')) {
          console.log("✅ User already exists in main db (race condition)");
        } else {
          return NextResponse.json(
            { error: "Failed to sync user account: " + mainDbError.message },
            { status: 500 }
          );
        }
      }
    }

    console.log("✅ User confirmed to exist in main db, proceeding with buyer creation...");

    const body = await request.json();
    const validatedData = createBuyerSchema.parse(body);

    // Transform empty strings to undefined for optional fields
    const buyerData = {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
      notes: validatedData.notes === "" ? null : validatedData.notes,
      ownerId: actualUserId, // Use the resolved actual user ID
    };
    const [newBuyer] = await db.insert(buyers).values(buyerData).returning();

    // Create history entry
    await db.insert(buyerHistory).values({
      id: uuidv4(),
      buyerId: newBuyer.id,
      changedBy: actualUserId, // Use the resolved actual user ID
      diff: {
        created: {
          old: null,
          new: "Lead created",
        },
      },
    });

    return NextResponse.json(newBuyer, { status: 201 });
  } catch (error: any) {
    console.error("Error creating buyer:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    // Handle foreign key constraint violation specifically
    if (
      error.cause?.code === "23503" &&
      error.cause?.constraint_name === "buyers_owner_id_users_id_fk"
    ) {
      console.error("Foreign key constraint violation - user does not exist");
      return NextResponse.json(
        { error: "Authentication error - please sign in again" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCustomSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const city = searchParams.get("city") || undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    const status = searchParams.get("status") || undefined;
    const timeline = searchParams.get("timeline") || undefined;
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const filters = buyerFiltersSchema.parse({
      page,
      limit,
      search,
      city,
      propertyType,
      status,
      timeline,
      sortBy,
      sortOrder,
    });

    const offset = (filters.page - 1) * filters.limit;

    // Build where conditions
    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          ilike(buyers.fullName, `%${filters.search}%`),
          ilike(buyers.phone, `%${filters.search}%`),
          ilike(buyers.email, `%${filters.search}%`)
        )
      );
    }

    if (filters.city) {
      conditions.push(eq(buyers.city, filters.city));
    }

    if (filters.propertyType) {
      conditions.push(eq(buyers.propertyType, filters.propertyType));
    }

    if (filters.status) {
      conditions.push(eq(buyers.status, filters.status));
    }

    if (filters.timeline) {
      conditions.push(eq(buyers.timeline, filters.timeline));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by clause
    let orderClause;
    switch (filters.sortBy) {
      case "fullName":
        orderClause =
          filters.sortOrder === "asc"
            ? asc(buyers.fullName)
            : desc(buyers.fullName);
        break;
      case "phone":
        orderClause =
          filters.sortOrder === "asc" ? asc(buyers.phone) : desc(buyers.phone);
        break;
      case "city":
        orderClause =
          filters.sortOrder === "asc" ? asc(buyers.city) : desc(buyers.city);
        break;
      case "propertyType":
        orderClause =
          filters.sortOrder === "asc"
            ? asc(buyers.propertyType)
            : desc(buyers.propertyType);
        break;
      case "status":
        orderClause =
          filters.sortOrder === "asc"
            ? asc(buyers.status)
            : desc(buyers.status);
        break;
      case "updatedAt":
      default:
        orderClause =
          filters.sortOrder === "asc"
            ? asc(buyers.updatedAt)
            : desc(buyers.updatedAt);
        break;
    }

    // Get buyers with pagination
    const [buyersList, totalCount] = await Promise.all([
      db
        .select()
        .from(buyers)
        .where(whereClause)
        .orderBy(orderClause)
        .limit(filters.limit)
        .offset(offset),
      db
        .select({ count: sql`count(*)` })
        .from(buyers)
        .where(whereClause)
        .then((result) => parseInt(result[0].count as string)),
    ]);

    const totalPages = Math.ceil(totalCount / filters.limit);

    return NextResponse.json({
      buyers: buyersList,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPrevPage: filters.page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error fetching buyers:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
