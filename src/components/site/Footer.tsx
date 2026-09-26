import Link from "next/link";
import { CATALOG } from "@/lib/catalog";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="site-ft">
      <div className="wrap">
        <div className="ft-grid">
          <div>
            <div className="logo" style={{ color: "#fff" }}>
              <LogoMark bg="#fff" fg="#0D0B0B" />
              <span className="logo-word">
                <b style={{ color: "#fff" }}>Sticker Status</b>
                <i>DIRECT</i>
              </span>
            </div>
            <p style={{ marginTop: 14, maxWidth: "36ch" }}>
              Custom stickers from the crew at Sticker Status, Boise&apos;s wrap, tint and PPF shop. StickerStatusDirect.com
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            {CATALOG.products.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/stickers/${p.id}`}>
                {p.name}
              </Link>
            ))}
          </div>
          <div>
            <h4>Help</h4>
            <Link href="/track">Track an order</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/business#quote">Get a quote</Link>
            <Link href="/account">Your account</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/business">Business / Bulk</Link>
            <Link href="/#gallery">Gallery</Link>
            <Link href="/#why">Why us</Link>
          </div>
        </div>
        <div className="ft-base">
          <span>© {new Date().getFullYear()} Sticker Status Direct · Boise, Idaho</span>
          <span>Made by Sticker Status</span>
        </div>
      </div>
    </footer>
  );
}
