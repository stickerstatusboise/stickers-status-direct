import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Server-side database connection. Uses DATABASE_URL: Supabase's "Transaction pooler" connection string
 * (Project Settings → Database → Connection string), which suits Vercel's short-lived functions.
 */
const globalForDb = globalThis as unknown as { ssdSql?: ReturnType<typeof postgres> };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local (local) or Vercel → Settings → Environment Variables.");
  // prepare: false is required by Supabase's transaction pooler
  return (globalForDb.ssdSql ??= postgres(url, { prepare: false, max: 5 }));
}

export const getDb = () => drizzle(connect(), { schema });
