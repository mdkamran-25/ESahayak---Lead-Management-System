import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth/config";
import { db } from "../../../../lib/db";
import { buyers, buyerHistory } from "../../../../lib/db/schema";
import { updateBuyerSchema } from "../../../../lib/validations/buyer";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buyerId = params.id;

    // Get buyer with history
    const [buyer] = await db
      .select()
      .from(buyers)
      .where(eq(buyers.id, buyerId))
      .limit(1);

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Get buyer history (last 5 changes)
    const history = await db
      .select({
        id: buyerHistory.id,
        changedAt: buyerHistory.changedAt,
        diff: buyerHistory.diff,
        changedBy: buyerHistory.changedBy,
      })
      .from(buyerHistory)
      .where(eq(buyerHistory.buyerId, buyerId))
      .orderBy(desc(buyerHistory.changedAt))
      .limit(5);

    return NextResponse.json({
      buyer,
      history,
    });
  } catch (error: any) {
    console.error("Error fetching buyer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buyerId = params.id;
    const body = await request.json();

    // Validate input data
    const validatedData = updateBuyerSchema.parse(body);

    // Get current buyer for ownership check and concurrency control
    const [currentBuyer] = await db
      .select()
      .from(buyers)
      .where(eq(buyers.id, buyerId))
      .limit(1);

    if (!currentBuyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Check ownership
    if (currentBuyer.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own leads" },
        { status: 403 }
      );
    }

    // Check for concurrency issues (if updatedAt is provided)
    if (validatedData.updatedAt) {
      const providedTime = new Date(validatedData.updatedAt).getTime();
      const currentTime = new Date(currentBuyer.updatedAt).getTime();

      if (providedTime !== currentTime) {
        return NextResponse.json(
          {
            error:
              "Record has been changed by someone else. Please refresh and try again.",
            currentUpdatedAt: currentBuyer.updatedAt,
          },
          { status: 409 }
        );
      }
    }

    // Create diff for history tracking
    const diff: Record<string, { old: any; new: any }> = {};

    Object.keys(validatedData).forEach((key) => {
      if (key === "updatedAt") return; // Skip updatedAt from diff

      const newValue = (validatedData as any)[key];
      const oldValue = (currentBuyer as any)[key];

      // Compare values (handle arrays separately)
      const isChanged = Array.isArray(newValue)
        ? JSON.stringify(newValue) !== JSON.stringify(oldValue)
        : newValue !== oldValue;

      if (isChanged) {
        diff[key] = {
          old: oldValue,
          new: newValue,
        };
      }
    });

    // Prepare update data
    const updateData = {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
      notes: validatedData.notes === "" ? null : validatedData.notes,
      updatedAt: new Date(),
    };

    // Remove fields we don't want to update directly
    delete (updateData as any).updatedAt; // Will be set automatically

    // Update buyer
    const [updatedBuyer] = await db
      .update(buyers)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(buyers.id, buyerId))
      .returning();

    // Create history entry if there are changes
    if (Object.keys(diff).length > 0) {
      await db.insert(buyerHistory).values({
        id: uuidv4(),
        buyerId: buyerId,
        changedBy: session.user.id,
        diff: diff,
      });
    }

    return NextResponse.json(updatedBuyer);
  } catch (error: any) {
    console.error("Error updating buyer:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buyerId = params.id;

    // Get current buyer for ownership check
    const [currentBuyer] = await db
      .select()
      .from(buyers)
      .where(eq(buyers.id, buyerId))
      .limit(1);

    if (!currentBuyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Check ownership
    if (currentBuyer.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own leads" },
        { status: 403 }
      );
    }

    // Delete buyer (history will be cascade deleted)
    await db.delete(buyers).where(eq(buyers.id, buyerId));

    return NextResponse.json({ message: "Buyer deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting buyer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
