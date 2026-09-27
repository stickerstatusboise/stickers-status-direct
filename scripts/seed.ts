/**
 * Load the prototype's sample customers and orders into the database in DATABASE_URL.
 *
 *   npm run db:seed              refuses if there are already orders
 *   npm run db:seed -- --reset   deletes EVERYTHING first, then loads the samples
 *
 * Set ADMIN_EMAIL to also create (or promote) an admin account for that email.
 * This is demo data: wipe it before launch.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { resetDatabase, seedDatabase } from "../src/server/db/seed";
import type { Db } from "../src/server/db/types";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema }) as unknown as Db;
  try {
    const reset = process.argv.includes("--reset");
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from orders`)) as unknown as { n: number }[];
    if (n > 0 && !reset) {
      console.log(`The database already has ${n} orders. Nothing changed. Use --reset to wipe it and reload the samples.`);
      return;
    }
    if (reset) {
      await resetDatabase(db);
      console.log("Wiped all data.");
    }
    const r = await seedDatabase(db, { adminEmail: process.env.ADMIN_EMAIL });
    console.log(`Loaded ${r.customers} customers and ${r.orders} sample orders.${process.env.ADMIN_EMAIL ? ` Admin: ${process.env.ADMIN_EMAIL}` : ""}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
