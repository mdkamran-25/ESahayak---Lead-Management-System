import {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters";
import { authDb } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export function CustomDrizzleAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      console.log("🔧 NextAuth trying to create user:", user.email);
      console.log("🚫 Skipping NextAuth user creation - handled by custom API");
      
      // Don't create user here - let our custom API handle it
      // Return a dummy user to satisfy NextAuth interface
      return {
        id: "pending",
        name: user.name || null,
        email: user.email,
        emailVerified: user.emailVerified || null,
        image: user.image || null,
      };
    },

    async getUser(id) {
      const [user] = await authDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return user || null;
    },

    async getUserByEmail(email) {
      const [user] = await authDb
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return user || null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const [account] = await authDb
        .select({ user: users })
        .from(accounts)
        .innerJoin(users, eq(accounts.userId, users.id))
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        )
        .limit(1);

      return account?.user || null;
    },

    async updateUser(user) {
      const [updatedUser] = await authDb
        .update(users)
        .set({
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
        })
        .where(eq(users.id, user.id!))
        .returning();

      return updatedUser;
    },

    async deleteUser(userId) {
      await authDb.delete(users).where(eq(users.id, userId));
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      await authDb.insert(accounts).values({
        id: uuidv4(),
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await authDb
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        );
    },

    async createSession({ sessionToken, userId, expires }) {
      const session = {
        id: uuidv4(),
        sessionToken,
        userId,
        expires,
      };

      await authDb.insert(sessions).values(session);
      return session;
    },

    async getSessionAndUser(sessionToken) {
      console.log("🔍 Adapter: Looking for session token:", sessionToken?.substring(0, 20) + "...");
      
      const [sessionAndUser] = await authDb
        .select({
          session: sessions,
          user: users,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.sessionToken, sessionToken))
        .limit(1);

      console.log("🔍 Adapter: Found session?", !!sessionAndUser, sessionAndUser?.user?.email || "none");
      return sessionAndUser || null;
    },

    async updateSession({ sessionToken, expires }) {
      const [session] = await authDb
        .update(sessions)
        .set({ expires })
        .where(eq(sessions.sessionToken, sessionToken))
        .returning();

      return session || null;
    },

    async deleteSession(sessionToken) {
      await authDb
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken({ identifier, expires, token }) {
      console.log("🎫 Creating verification token for:", identifier);
      
      const verificationToken = {
        identifier,
        token,
        expires,
      };

      try {
        await authDb.insert(verificationTokens).values(verificationToken);
        console.log("✅ Verification token created");
        return verificationToken;
      } catch (error) {
        console.error("❌ Failed to create verification token:", error);
        throw error;
      }
    },

    async useVerificationToken({ identifier, token }) {
      console.log("🔍 NextAuth trying to use verification token for:", identifier);
      console.log("🚫 Skipping NextAuth token consumption - handled by custom API");
      
      // Don't consume the token here - let our custom API handle it
      // Just return null so NextAuth doesn't create a user automatically
      return null;
    },
  };
}
