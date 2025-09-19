import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, name, token, callbackUrl } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    console.log("📧 Sending custom verification email to:", email);

    // Create custom verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/auth/verify-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl || '/buyers')}`;
    
    console.log("✨ Custom verify URL:", verifyUrl);

    // Create email transporter
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST!,
      port: parseInt(process.env.EMAIL_SERVER_PORT!),
      auth: {
        user: process.env.EMAIL_SERVER_USER!,
        pass: process.env.EMAIL_SERVER_PASSWORD!,
      },
    });

    // Send email
    const result = await transport.sendMail({
      to: email,
      from: process.env.EMAIL_FROM!,
      subject: `Welcome to ESahayak - Verify your account`,
      text: `Welcome to ESahayak!

${name ? `Hello ${name},` : 'Hello,'}

Your account has been created successfully! Click the link below to verify your email and sign in:

${verifyUrl}

This link will expire in 24 hours for security reasons.

Welcome to the team!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Welcome to ESahayak!</h1>
          <p>${name ? `Hello ${name},` : 'Hello,'}</p>
          <p>Your account has been created successfully! Click the button below to verify your email and sign in:</p>
          <a href="${verifyUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0; font-weight: 500;">
            Verify Account & Sign In
          </a>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">${verifyUrl}</p>
          <p>This link will expire in 24 hours for security reasons.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    const failed = result.rejected.concat(result.pending).filter(Boolean);
    if (failed.length) {
      throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
    }

    console.log("✅ Custom verification email sent successfully");

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully"
    });

  } catch (error) {
    console.error("❌ Failed to send custom email:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
