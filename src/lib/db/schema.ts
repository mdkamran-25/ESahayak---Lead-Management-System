import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  json,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const cityEnum = pgEnum("city", [
  "Chandigarh",
  "Mohali",
  "Zirakpur",
  "Panchkula",
  "Other",
]);

export const propertyTypeEnum = pgEnum("property_type", [
  "Apartment",
  "Villa",
  "Plot",
  "Office",
  "Retail",
]);

export const bhkEnum = pgEnum("bhk", ["1", "2", "3", "4", "Studio"]);

export const purposeEnum = pgEnum("purpose", ["Buy", "Rent"]);

export const timelineEnum = pgEnum("timeline", [
  "0-3m",
  "3-6m",
  ">6m",
  "Exploring",
]);

export const sourceEnum = pgEnum("source", [
  "Website",
  "Referral",
  "Walk-in",
  "Call",
  "Other",
]);

export const statusEnum = pgEnum("status", [
  "New",
  "Qualified",
  "Contacted",
  "Visited",
  "Negotiation",
  "Converted",
  "Dropped",
]);

// Users table for NextAuth (matching actual database)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified"), // snake_case to match DB
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Alias for NextAuth adapter compatibility
export const user = users;

// Accounts table for NextAuth (matching actual database)
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
});

// Sessions table for NextAuth (matching actual database)
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expires: timestamp("expires").notNull(),
});

// Verification tokens table for NextAuth (matching actual database)
export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
});

// Main buyers table
export const buyers = pgTable(
  "buyers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 80 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 15 }).notNull(),
    city: cityEnum("city").notNull(),
    propertyType: propertyTypeEnum("property_type").notNull(),
    bhk: bhkEnum("bhk"),
    purpose: purposeEnum("purpose").notNull(),
    budgetMin: integer("budget_min"),
    budgetMax: integer("budget_max"),
    timeline: timelineEnum("timeline").notNull(),
    source: sourceEnum("source").notNull(),
    status: statusEnum("status").notNull().default("New"),
    notes: text("notes"),
    tags: json("tags").$type<string[]>().default([]),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("buyers_owner_idx").on(table.ownerId),
    statusIdx: index("buyers_status_idx").on(table.status),
    cityIdx: index("buyers_city_idx").on(table.city),
    propertyTypeIdx: index("buyers_property_type_idx").on(table.propertyType),
    updatedAtIdx: index("buyers_updated_at_idx").on(table.updatedAt),
    phoneIdx: index("buyers_phone_idx").on(table.phone),
  })
);

// Buyer history table for tracking changes
export const buyerHistory = pgTable(
  "buyer_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .references(() => buyers.id, { onDelete: "cascade" })
      .notNull(),
    changedBy: uuid("changed_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    diff: json("diff")
      .$type<Record<string, { old: unknown; new: unknown }>>()
      .notNull(),
  },
  (table) => ({
    buyerIdx: index("buyer_history_buyer_idx").on(table.buyerId),
    changedAtIdx: index("buyer_history_changed_at_idx").on(table.changedAt),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  buyers: many(buyers),
  buyerHistory: many(buyerHistory),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const buyersRelations = relations(buyers, ({ one, many }) => ({
  owner: one(users, {
    fields: [buyers.ownerId],
    references: [users.id],
  }),
  history: many(buyerHistory),
}));

export const buyerHistoryRelations = relations(buyerHistory, ({ one }) => ({
  buyer: one(buyers, {
    fields: [buyerHistory.buyerId],
    references: [buyers.id],
  }),
  changedBy: one(users, {
    fields: [buyerHistory.changedBy],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Buyer = typeof buyers.$inferSelect;
export type NewBuyer = typeof buyers.$inferInsert;
export type BuyerHistory = typeof buyerHistory.$inferSelect;
export type NewBuyerHistory = typeof buyerHistory.$inferInsert;
