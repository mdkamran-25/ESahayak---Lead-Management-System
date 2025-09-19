import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database tables...');

    // Create enums first
    await sql`
      DO $$ BEGIN
        CREATE TYPE "bhk" AS ENUM('1', '2', '3', '4', 'Studio');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ BHK enum created/exists');

    await sql`
      DO $$ BEGIN
        CREATE TYPE "property_type" AS ENUM('Apartment', 'Villa', 'Plot', 'Office', 'Warehouse', 'Other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Property type enum created/exists');

    await sql`
      DO $$ BEGIN
        CREATE TYPE "purpose" AS ENUM('Buy', 'Rent', 'Lease');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Purpose enum created/exists');

    await sql`
      DO $$ BEGIN
        CREATE TYPE "timeline" AS ENUM('0-3m', '3-6m', '6-12m', '12m+', 'Flexible');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Timeline enum created/exists');

    await sql`
      DO $$ BEGIN
        CREATE TYPE "source" AS ENUM('Website', 'Referral', 'Social Media', 'Advertisement', 'Walk-in', 'Other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Source enum created/exists');

    await sql`
      DO $$ BEGIN
        CREATE TYPE "status" AS ENUM('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Status enum created/exists');

    // Create buyers table
    await sql`
      CREATE TABLE IF NOT EXISTS "buyers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "full_name" varchar(255) NOT NULL,
        "email" varchar(255),
        "phone" varchar(20) NOT NULL,
        "city" varchar(100) NOT NULL,
        "property_type" "property_type" NOT NULL,
        "bhk" "bhk",
        "purpose" "purpose" NOT NULL,
        "budget_min" integer NOT NULL,
        "budget_max" integer NOT NULL,
        "timeline" "timeline" NOT NULL,
        "source" "source" NOT NULL,
        "status" "status" NOT NULL DEFAULT 'New',
        "notes" text,
        "tags" text[] DEFAULT '{}',
        "owner_id" uuid NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "buyers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE cascade
      );
    `;
    console.log('✅ Buyers table created/exists');

    // Create indexes for buyers table
    await sql`CREATE INDEX IF NOT EXISTS "buyers_owner_id_idx" ON "buyers" ("owner_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "buyers_status_idx" ON "buyers" ("status");`;
    await sql`CREATE INDEX IF NOT EXISTS "buyers_created_at_idx" ON "buyers" ("created_at");`;
    await sql`CREATE INDEX IF NOT EXISTS "buyers_updated_at_idx" ON "buyers" ("updated_at");`;
    await sql`CREATE INDEX IF NOT EXISTS "buyers_city_idx" ON "buyers" ("city");`;
    await sql`CREATE INDEX IF NOT EXISTS "buyers_property_type_idx" ON "buyers" ("property_type");`;
    console.log('✅ Buyers indexes created');

    // Create buyer_history table
    await sql`
      CREATE TABLE IF NOT EXISTS "buyer_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "buyer_id" uuid NOT NULL,
        "changed_by" uuid NOT NULL,
        "diff" jsonb NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "buyer_history_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE cascade,
        CONSTRAINT "buyer_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE cascade
      );
    `;
    console.log('✅ Buyer history table created/exists');

    // Create indexes for buyer_history table
    await sql`CREATE INDEX IF NOT EXISTS "buyer_history_buyer_id_idx" ON "buyer_history" ("buyer_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "buyer_history_created_at_idx" ON "buyer_history" ("created_at");`;
    console.log('✅ Buyer history indexes created');

    // Fix emailVerified column if needed
    await sql`
      DO $$ BEGIN
        ALTER TABLE "user" ADD COLUMN "emailVerified" timestamp;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        ALTER TABLE "user" DROP COLUMN IF EXISTS "email_verified";
      EXCEPTION
        WHEN undefined_column THEN null;
      END $$;
    `;
    console.log('✅ User table emailVerified column fixed');

    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupDatabase();
