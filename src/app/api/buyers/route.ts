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
    // First try NextAuth's getServerSession
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      console.log("✅ NextAuth session found:", session.user.email);
      return session;
    }

    console.log("⚠️ NextAuth session not found, trying custom validation...");
    
    // Fallback: manually validate session cookie using our adapter
    const sessionToken = request.cookies.get("next-auth.session-token")?.value;
    if (!sessionToken) {
      console.log("❌ No session cookie found");
      return null;
    }

    console.log("🔍 Found session token:", sessionToken.substring(0, 20) + "...");

    // Use our custom adapter to validate the session
    const adapter = CustomDrizzleAdapter();
    const sessionAndUser = await adapter.getSessionAndUser!(sessionToken);
    
    if (!sessionAndUser || sessionAndUser.session.expires < new Date()) {
      console.log("❌ Session expired or invalid");
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

    console.log("User not found, creating user...");
    try {
      await authDb.insert(users).values({
        id: userId,
        email: email || "",
        name: name || null,
        image: image || null,
      });
      console.log("User created successfully");
      return;
    } catch (userCreateError: any) {
      console.error(
        `User creation attempt ${attempts} failed:`,
        userCreateError
      );
      if (attempts >= maxAttempts) {
        throw new Error("Failed to create user after multiple attempts");
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Session user ID:", session.user.id);

    // Comprehensive user existence check and creation
    try {
      await ensureUserExists(
        session.user.id,
        session.user.email,
        session.user.name,
        session.user.image
      );
    } catch (userError: any) {
      console.error("Failed to ensure user exists:", userError);
      return NextResponse.json(
        { error: "Failed to initialize user account" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validatedData = createBuyerSchema.parse(body);

    // Transform empty strings to undefined for optional fields
    const buyerData = {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
      notes: validatedData.notes === "" ? null : validatedData.notes,
      ownerId: session.user.id,
    };

    // Double-check user exists just before creating buyer
    console.log("Double-checking user exists before buyer creation...");
    const userCheck = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (userCheck.length === 0) {
      console.log("User not found in main db, creating in main db as well...");
      try {
        await db.insert(users).values({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.name || null,
          image: session.user.image || null,
        });
        console.log("User created in main db successfully");
      } catch (mainDbError: any) {
        console.error("Failed to create user in main db:", mainDbError);
        return NextResponse.json(
          { error: "Failed to initialize user account" },
          { status: 500 }
        );
      }
    }

    console.log("User confirmed to exist, proceeding with buyer creation...");
    const [newBuyer] = await db.insert(buyers).values(buyerData).returning();

    // Create history entry
    await db.insert(buyerHistory).values({
      id: uuidv4(),
      buyerId: newBuyer.id,
      changedBy: session.user.id,
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
