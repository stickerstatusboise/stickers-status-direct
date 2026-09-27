import { requireStaff } from "@/server/auth/session";

export default async function AdminPage() {
  const me = await requireStaff("/admin");
  return (
    <div className="wrap soon" style={{ paddingTop: 40 }}>
      <h1 style={{ fontSize: "clamp(40px,6vw,72px)" }}>Admin</h1>
      <p className="lede" style={{ marginTop: 12 }}>
        Signed in as {me.email} ({me.role}). The order dashboard (orders by status, order drawer, proofs, notes, tracking) is step 7.
      </p>
    </div>
  );
}
