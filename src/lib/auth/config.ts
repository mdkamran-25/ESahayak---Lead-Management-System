import { NextAuthOptions } from "next-auth";
import { CustomDrizzleAdapter } from "./custom-adapter";

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
    // No email provider - we use our custom system
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
    signIn: async ({ user, account, profile, email, credentials }) => {
      // Allow sign in
      return true;
    },
  },
};
