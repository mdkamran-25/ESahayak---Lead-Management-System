import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth/config";
import { db } from "../../../../lib/db";
import { buyers } from "../../../../lib/db/schema";
import {
  buyerFiltersSchema,
  stringifyTags,
} from "../../../../lib/validations/buyer";
import { eq, and, or, ilike, desc, asc } from "drizzle-orm";
import Papa from "papaparse";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters (same as in the main buyers API)
    const search = searchParams.get("search") || undefined;
    const city = searchParams.get("city") || undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    const status = searchParams.get("status") || undefined;
    const timeline = searchParams.get("timeline") || undefined;
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const filters = buyerFiltersSchema.parse({
      page: 1,
      limit: 10000, // Large limit for export (we'll export all matching records)
      search,
      city,
      propertyType,
      status,
      timeline,
      sortBy,
      sortOrder,
    });

    // Build where conditions (same logic as main buyers API)
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

    // Get all matching buyers
    const buyersList = await db
      .select()
      .from(buyers)
      .where(whereClause)
      .orderBy(orderClause);

    if (buyersList.length === 0) {
      return NextResponse.json(
        { error: "No buyers found matching the current filters" },
        { status: 404 }
      );
    }

    // Transform data for CSV export
    const csvData = buyersList.map((buyer) => ({
      fullName: buyer.fullName,
      email: buyer.email || "",
      phone: buyer.phone,
      city: buyer.city,
      propertyType: buyer.propertyType,
      bhk: buyer.bhk || "",
      purpose: buyer.purpose,
      budgetMin: buyer.budgetMin || "",
      budgetMax: buyer.budgetMax || "",
      timeline: buyer.timeline,
      source: buyer.source,
      notes: buyer.notes || "",
      tags: stringifyTags(buyer.tags || []),
      status: buyer.status,
      createdAt: buyer.createdAt.toISOString(),
      updatedAt: buyer.updatedAt.toISOString(),
    }));

    // Generate CSV
    const csv = Papa.unparse(csvData, {
      header: true,
      columns: [
        "fullName",
        "email",
        "phone",
        "city",
        "propertyType",
        "bhk",
        "purpose",
        "budgetMin",
        "budgetMax",
        "timeline",
        "source",
        "notes",
        "tags",
        "status",
        "createdAt",
        "updatedAt",
      ],
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `buyers-export-${timestamp}.csv`;

    // Set response headers for file download
    const response = new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });

    return response;
  } catch (error: any) {
    console.error("Error exporting CSV:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
