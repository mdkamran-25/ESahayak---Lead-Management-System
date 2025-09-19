import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth/config";
import { db } from "../../../../lib/db";
import { buyers, buyerHistory } from "../../../../lib/db/schema";
import {
  csvBuyerSchema,
  parseCsvTags,
} from "../../../../lib/validations/buyer";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";

interface CsvValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface CsvImportResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: CsvValidationError[];
  importedIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a CSV file." },
        { status: 400 }
      );
    }

    const fileContent = await file.text();

    // Parse CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid CSV format", details: parseResult.errors },
        { status: 400 }
      );
    }

    const rows = parseResult.data as any[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    if (rows.length > 200) {
      return NextResponse.json(
        { error: "CSV file contains too many rows. Maximum 200 rows allowed." },
        { status: 400 }
      );
    }

    // Expected headers
    const expectedHeaders = [
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
    ];

    const csvHeaders = Object.keys(rows[0]);
    const missingHeaders = expectedHeaders.filter(
      (header) => !csvHeaders.includes(header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required CSV headers",
          missingHeaders,
          expectedHeaders,
        },
        { status: 400 }
      );
    }

    // Validate and prepare data
    const validRows: any[] = [];
    const errors: CsvValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because we skip header and array is 0-indexed

      try {
        // Transform and validate row data
        const transformedRow = {
          fullName: row.fullName?.trim() || "",
          email: row.email?.trim() || "",
          phone: row.phone?.toString().trim() || "",
          city: row.city?.trim() || "",
          propertyType: row.propertyType?.trim() || "",
          bhk: row.bhk?.trim() || "",
          purpose: row.purpose?.trim() || "",
          budgetMin: row.budgetMin ? parseInt(row.budgetMin) : "",
          budgetMax: row.budgetMax ? parseInt(row.budgetMax) : "",
          timeline: row.timeline?.trim() || "",
          source: row.source?.trim() || "",
          notes: row.notes?.trim() || "",
          tags: row.tags?.trim() || "",
          status: row.status?.trim() || "New",
        };

        // Validate with Zod schema
        const validatedData = csvBuyerSchema.parse(transformedRow);

        // Parse tags
        const parsedTags = parseCsvTags(validatedData.tags || "");

        // Prepare for database insertion
        const buyerData = {
          id: uuidv4(),
          fullName: validatedData.fullName,
          email: validatedData.email || null,
          phone: validatedData.phone,
          city: validatedData.city,
          propertyType: validatedData.propertyType,
          bhk: validatedData.bhk || null,
          purpose: validatedData.purpose,
          budgetMin: validatedData.budgetMin || null,
          budgetMax: validatedData.budgetMax || null,
          timeline: validatedData.timeline,
          source: validatedData.source,
          status: validatedData.status,
          notes: validatedData.notes || null,
          tags: parsedTags,
          ownerId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        validRows.push(buyerData);
      } catch (error: any) {
        if (error.errors) {
          // Zod validation errors
          error.errors.forEach((err: any) => {
            errors.push({
              row: rowNumber,
              field: err.path[0] || "unknown",
              message: err.message,
              value: row[err.path[0]] || "unknown",
            });
          });
        } else {
          errors.push({
            row: rowNumber,
            field: "general",
            message: error.message || "Unknown error",
            value: "",
          });
        }
      }
    }

    // Import valid rows in a transaction
    const importedIds: string[] = [];

    if (validRows.length > 0) {
      try {
        // Insert buyers
        const insertedBuyers = await db
          .insert(buyers)
          .values(validRows)
          .returning({ id: buyers.id });

        // Create history entries for all imported buyers
        const historyEntries = insertedBuyers.map((buyer) => ({
          id: uuidv4(),
          buyerId: buyer.id,
          changedBy: session.user.id,
          diff: {
            imported: {
              old: null,
              new: "Lead imported from CSV",
            },
          },
        }));

        await db.insert(buyerHistory).values(historyEntries);

        importedIds.push(...insertedBuyers.map((b) => b.id));
      } catch (dbError: any) {
        console.error("Database error during import:", dbError);
        return NextResponse.json(
          { error: "Database error during import", details: dbError.message },
          { status: 500 }
        );
      }
    }

    const result: CsvImportResult = {
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: errors.length,
      errors,
      importedIds,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error importing CSV:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
