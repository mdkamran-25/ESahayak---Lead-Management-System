import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { CustomDrizzleAdapter } from "./custom-adapter";
import nodemailer from "nodemailer";

// Extend the session type to include user id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: CustomDrizzleAdapter(),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: parseInt(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const transport = nodemailer.createTransport(provider.server);

        const result = await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Sign in to ESahayak`,
          text: `Sign in to ESahayak

${url}

`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Sign in to ESahayak</h1>
              <p>Hello,</p>
              <p>You requested to sign in to ESahayak. Click the button below to sign in:</p>
              <a href="${url}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">
                Sign in to ESahayak
              </a>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${url}</p>
              <p>This link will expire in 24 hours for security reasons.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              <p style="color: #666; font-size: 14px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
          `,
        });

        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
        }
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  // Handle dynamic Vercel URLs automatically
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    session: async ({ session, user }) => {
      // With database sessions, user object is passed directly
      if (session?.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
