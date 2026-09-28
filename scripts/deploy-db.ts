/**
 * Runs on Vercel before each production build (package.json "vercel-build"):
 * 1. applies any new database migrations (drizzle/), so the live database always matches the code;
 * 2. creates the private storage buckets for artwork and proofs, if the service key is set;
 * 3. if SEED_SAMPLE_DATA=true and there are no orders yet, loads the prototype's sample data.
 *
 * Skips quietly when DATABASE_URL isn't set, and on preview deployments, so a work-in-progress branch
 * never changes the live database. A failed migration fails the build and the previous version stays live.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { seedDatabase } from "../src/server/db/seed";
import { ensureBuckets, storageConfigured } from "../src/server/storage";
import type { Db } from "../src/server/db/types";

async function main() {
  const env = process.env.VERCEL_ENV;
  if (env && env !== "production") return console.log(`[db] ${env} deployment: database left unchanged.`);
  const url = process.env.DATABASE_URL;
  if (!url) return console.log("[db] DATABASE_URL not set: skipping database setup.");

  const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("[db] Migrations up to date.");

    if (storageConfigured()) {
      await ensureBuckets();
      console.log("[db] Storage buckets ready.");
    } else console.log("[db] SUPABASE_SERVICE_ROLE_KEY not set: file uploads stay off.");

    if (process.env.SEED_SAMPLE_DATA === "true") {
      const [{ n }] = (await db.execute(sql`select count(*)::int as n from orders`)) as unknown as { n: number }[];
      if (n > 0) console.log(`[db] ${n} orders already exist: sample data not loaded.`);
      else {
        const r = await seedDatabase(db as unknown as Db, { adminEmail: process.env.ADMIN_EMAIL });
        console.log(`[db] Loaded ${r.customers} sample customers and ${r.orders} sample orders.`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[db] Database setup failed:", e);
  process.exit(1);
});
