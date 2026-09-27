import { requireStaff } from "@/server/auth/session";

export default async function ProductionPage() {
  await requireStaff("/production");
  return (
    <div className="wrap soon" style={{ paddingTop: 40 }}>
      <h1 style={{ fontSize: "clamp(40px,6vw,72px)" }}>Production queue</h1>
      <p className="lede" style={{ marginTop: 12 }}>
        The TV board for the print floor is step 8.
      </p>
    </div>
  );
}
