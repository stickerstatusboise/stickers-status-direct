import { eq } from "drizzle-orm";
import { customers, type Customer } from "../db/schema";
import type { Db } from "../db/types";

/**
 * Find the customer record for a signed-in Supabase user, linking or creating it on first sign-in.
 * Existing customers (from past orders or the sample data) are matched by email.
 */
export async function linkCustomer(db: Db, user: { id: string; email: string }): Promise<Customer> {
  const email = user.email.trim().toLowerCase();
  const [byAuth] = await db.select().from(customers).where(eq(customers.authUserId, user.id));
  if (byAuth) return byAuth;

  const [byEmail] = await db.select().from(customers).where(eq(customers.email, email));
  if (byEmail) {
    const [linked] = await db.update(customers).set({ authUserId: user.id }).where(eq(customers.id, byEmail.id)).returning();
    return linked;
  }

  const [created] = await db
    .insert(customers)
    .values({ email, authUserId: user.id, name: email.split("@")[0] })
    .onConflictDoUpdate({ target: customers.email, set: { authUserId: user.id } })
    .returning();
  return created;
}

export const isStaff = (c: Pick<Customer, "role"> | null | undefined) => c?.role === "staff" || c?.role === "admin";

/** Only same-site paths are allowed as a redirect after sign-in. */
export function safeNext(next: unknown, fallback = "/account"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

export interface ProfileInput {
  name: string;
  phone?: string;
  company?: string;
  address?: { line1: string; line2?: string; city: string; state: string; zip: string };
}

/** Account info tab. Email can't be changed here (it's the sign-in). */
export async function updateProfile(db: Db, customerId: string, input: ProfileInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Please enter your name");
  const clean = (v?: string) => v?.trim() || null;
  const a = input.address;
  const hasAddress = a && [a.line1, a.city, a.state, a.zip].some((v) => v?.trim());
  const [row] = await db
    .update(customers)
    .set({
      name,
      phone: clean(input.phone),
      company: clean(input.company),
      defaultAddress: hasAddress ? { line1: a.line1.trim(), line2: a.line2?.trim() ?? "", city: a.city.trim(), state: a.state.trim(), zip: a.zip.trim() } : null,
    })
    .where(eq(customers.id, customerId))
    .returning();
  return row;
}
