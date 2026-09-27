"use client";

import { useRouter } from "next/navigation";

/** Staff-only picker: see the account page as a customer sees it. */
export function StaffViewAs({ customers, current }: { customers: { id: string; name: string; company: string | null; orders: number }[]; current?: string }) {
  const router = useRouter();
  return (
    <div className="staff-note">
      <span>Staff view: see any customer&apos;s account as they see it. Proof buttons only work for the customer.</span>
      <label className="sr-only" htmlFor="view-as">
        View as customer
      </label>
      <select id="view-as" value={current ?? ""} onChange={(e) => router.push(e.target.value ? `/account?as=${e.target.value}` : "/account")}>
        <option value="">Your own account</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.company ? ` (${c.company})` : ""} · {c.orders} order{c.orders === 1 ? "" : "s"}
          </option>
        ))}
      </select>
    </div>
  );
}
