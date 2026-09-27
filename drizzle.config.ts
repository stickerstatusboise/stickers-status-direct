import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Read DATABASE_URL from .env.local like the app does
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Supabase "Session pooler" connection string (Project Settings → Database). Only needed to run migrations.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
