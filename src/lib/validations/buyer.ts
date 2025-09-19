import { z } from "zod";

// Enum schemas
export const citySchema = z.enum([
  "Chandigarh",
  "Mohali",
  "Zirakpur",
  "Panchkula",
  "Other",
]);

export const propertyTypeSchema = z.enum([
  "Apartment",
  "Villa",
  "Plot",
  "Office",
  "Retail",
]);

export const bhkSchema = z.enum(["1", "2", "3", "4", "Studio"]);

export const purposeSchema = z.enum(["Buy", "Rent"]);

export const timelineSchema = z.enum(["0-3m", "3-6m", ">6m", "Exploring"]);

export const sourceSchema = z.enum([
  "Website",
  "Referral",
  "Walk-in",
  "Call",
  "Other",
]);

export const statusSchema = z.enum([
  "New",
  "Qualified",
  "Contacted",
  "Visited",
  "Negotiation",
  "Converted",
  "Dropped",
]);

// Phone validation - numeric 10-15 digits
const phoneRegex = /^\d{10,15}$/;

// Custom phone validation
export const phoneSchema = z
  .string()
  .regex(phoneRegex, "Phone must be 10-15 digits")
  .min(10, "Phone must be at least 10 digits")
  .max(15, "Phone must be at most 15 digits");

// Budget validation
export const budgetSchema = z
  .object({
    budgetMin: z.number().int().positive().optional(),
    budgetMax: z.number().int().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return data.budgetMax >= data.budgetMin;
      }
      return true;
    },
    {
      message: "Budget max must be greater than or equal to budget min",
      path: ["budgetMax"],
    }
  );

// Main buyer schema for creation
export const createBuyerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name must be at most 80 characters")
      .trim(),
    email: z
      .string()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")),
    phone: phoneSchema,
    city: citySchema,
    propertyType: propertyTypeSchema,
    bhk: bhkSchema.optional(),
    purpose: purposeSchema,
    budgetMin: z.number().int().positive().optional(),
    budgetMax: z.number().int().positive().optional(),
    timeline: timelineSchema,
    source: sourceSchema,
    notes: z
      .string()
      .max(1000, "Notes must be at most 1000 characters")
      .optional()
      .or(z.literal("")),
    tags: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      // bhk is required for Apartment and Villa
      if (["Apartment", "Villa"].includes(data.propertyType)) {
        return !!data.bhk;
      }
      return true;
    },
    {
      message: "BHK is required for Apartment and Villa",
      path: ["bhk"],
    }
  )
  .refine(
    (data) => {
      // Budget validation
      if (data.budgetMin && data.budgetMax) {
        return data.budgetMax >= data.budgetMin;
      }
      return true;
    },
    {
      message: "Budget max must be greater than or equal to budget min",
      path: ["budgetMax"],
    }
  );

// Schema for updating buyers (includes status and handles refinements properly)
export const updateBuyerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name must be at most 80 characters")
      .trim(),
    email: z
      .string()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")),
    phone: phoneSchema,
    city: citySchema,
    propertyType: propertyTypeSchema,
    bhk: bhkSchema.optional(),
    purpose: purposeSchema,
    budgetMin: z.number().int().positive().optional(),
    budgetMax: z.number().int().positive().optional(),
    timeline: timelineSchema,
    source: sourceSchema,
    notes: z
      .string()
      .max(1000, "Notes must be at most 1000 characters")
      .optional()
      .or(z.literal("")),
    tags: z.array(z.string()).default([]),
    status: statusSchema.optional(),
    updatedAt: z.date().optional(),
  })
  .refine(
    (data) => {
      // bhk is required for Apartment and Villa
      if (["Apartment", "Villa"].includes(data.propertyType)) {
        return !!data.bhk;
      }
      return true;
    },
    {
      message: "BHK is required for Apartment and Villa",
      path: ["bhk"],
    }
  )
  .refine(
    (data) => {
      // Budget validation
      if (data.budgetMin && data.budgetMax) {
        return data.budgetMax >= data.budgetMin;
      }
      return true;
    },
    {
      message: "Budget max must be greater than or equal to budget min",
      path: ["budgetMax"],
    }
  );

// Schema for filtering/searching buyers
export const buyerFiltersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
  search: z.string().optional(),
  city: citySchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  status: statusSchema.optional(),
  timeline: timelineSchema.optional(),
  sortBy: z
    .enum(["fullName", "phone", "city", "propertyType", "status", "updatedAt"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Schema for CSV import
export const csvBuyerSchema = z
  .object({
    fullName: z.string().min(2).max(80).trim(),
    email: z
      .string()
      .email()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)),
    phone: phoneSchema,
    city: citySchema,
    propertyType: propertyTypeSchema,
    bhk: z
      .union([bhkSchema, z.literal("")])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    purpose: purposeSchema,
    budgetMin: z
      .union([z.number().int().positive(), z.literal("")])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    budgetMax: z
      .union([z.number().int().positive(), z.literal("")])
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
    timeline: timelineSchema,
    source: sourceSchema,
    notes: z
      .string()
      .max(1000)
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)),
    tags: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)), // Will be parsed as comma-separated
    status: statusSchema.default("New"),
  })
  .refine(
    (data) => {
      // bhk is required for Apartment and Villa
      if (["Apartment", "Villa"].includes(data.propertyType)) {
        return !!data.bhk;
      }
      return true;
    },
    {
      message: "BHK is required for Apartment and Villa",
      path: ["bhk"],
    }
  )
  .refine(
    (data) => {
      // Budget validation
      if (data.budgetMin && data.budgetMax) {
        return data.budgetMax >= data.budgetMin;
      }
      return true;
    },
    {
      message: "Budget max must be greater than or equal to budget min",
      path: ["budgetMax"],
    }
  );

// Rate limiting schema
export const rateLimitSchema = z.object({
  maxRequests: z.number().int().positive().default(10),
  windowMs: z.number().int().positive().default(60000), // 1 minute
});

// Auth schema
export const authSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Signup schema
export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters")
    .trim(),
  email: z.string().email("Invalid email format"),
});

// Export types
export type CreateBuyerInput = z.infer<typeof createBuyerSchema>;
export type UpdateBuyerInput = z.infer<typeof updateBuyerSchema>;
export type BuyerFilters = z.infer<typeof buyerFiltersSchema>;
export type CsvBuyerInput = z.infer<typeof csvBuyerSchema>;
export type AuthInput = z.infer<typeof authSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// Utility function to parse CSV tags
export function parseCsvTags(tags: string): string[] {
  if (!tags || tags.trim() === "") return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

// Utility function to stringify tags for CSV export
export function stringifyTags(tags: string[]): string {
  return tags.join(", ");
}
