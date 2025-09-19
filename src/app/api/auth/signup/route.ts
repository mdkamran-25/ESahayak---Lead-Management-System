import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validations/buyer";
import { authDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input data
    const validatedData = signupSchema.parse(body);

    // Note: User creation is handled by our custom verification system
    
    // Return success - the frontend will then trigger NextAuth signIn
    return NextResponse.json({
      message:
        "Ready to create your account! We'll send you a magic link to complete your signup.",
      email: validatedData.email,
      name: validatedData.name,
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}