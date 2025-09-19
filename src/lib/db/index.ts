import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Create connection with better error handling
const createConnection = (connectionString: string) => {
  try {
    return postgres(connectionString, {
      prepare: false,
      ssl: "require",
      max: 20,
      idle_timeout: 30,
      max_lifetime: 60 * 30,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error(
      `Failed to connect to database: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Main database connection
const client = createConnection(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

// Separate connection for auth operations with additional optimizations
const authClient = createConnection(process.env.DATABASE_URL);
export const authDb = drizzle(authClient, { schema });

export type Database = typeof db;
