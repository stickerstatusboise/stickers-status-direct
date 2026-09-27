import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Staff area shell. Each page checks the staff role itself (requireStaff). */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-shell">
      <div className="demobar-staff">
        <div className="wrap row" style={{ minHeight: 46 }}>
          <b style={{ fontFamily: "var(--display)", fontSize: 20, textTransform: "uppercase" }}>
            SSD <span style={{ color: "#ff5a6e" }}>Staff</span>
          </b>
          <Link href="/admin">Admin</Link>
          <Link href="/production">Production floor</Link>
          <span className="spacer" />
          <Link href="/">Customer site</Link>
        </div>
      </div>
      {children}
    </div>
  );
}
