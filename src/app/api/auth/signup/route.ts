import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validations/buyer";
import { authDb } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authOptions } from "@/lib/auth/config";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input data
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await authDb
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        {
          message:
            "An account with this email already exists. Please sign in instead.",
        },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      name: validatedData.name,
      email: validatedData.email,
      emailVerified: null,
      image: null,
    };

    const [createdUser] = await authDb
      .insert(users)
      .values(newUser)
      .returning();

    // Generate verification token and send welcome magic link
    const token = uuidv4();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const identifier = validatedData.email;

    await authDb.insert(verificationTokens).values({
      identifier,
      token,
      expires,
    });

    // Send welcome email with magic link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const signInUrl = `${baseUrl}/api/auth/callback/email?callbackUrl=${encodeURIComponent(
      `${baseUrl}/buyers`
    )}&token=${token}&email=${encodeURIComponent(identifier)}`;

    try {
      const transport = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST!,
        port: parseInt(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      });

      await transport.sendMail({
        to: identifier,
        from: process.env.EMAIL_FROM!,
        subject: "Welcome to ESahayak - Verify your account",
        text: `Welcome to ESahayak!

Your account has been created successfully. Click the link below to verify your email and complete your signup:

${signInUrl}

This link will expire in 24 hours for security reasons.

Welcome to the team!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to ESahayak!</h1>
            <p>Hello ${validatedData.name},</p>
            <p>Your account has been created successfully! Click the button below to verify your email and complete your signup:</p>
            <a href="${signInUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
              Verify Email & Sign In
            </a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${signInUrl}</p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            <p style="color: #666; font-size: 14px;">
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the signup if email fails
    }

    // Return success response (user will still need to verify email via magic link)
    return NextResponse.json({
      message:
        "Account created successfully! We'll send you a magic link to complete your signup.",
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      },
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
