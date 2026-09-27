"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-store";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "./Logo";

const NAV: [href: string, label: string][] = [
  ["/stickers", "Shop Stickers"],
  ["/#how", "How It Works"],
  ["/business", "Business / Bulk"],
  ["/#gallery", "Gallery"],
  ["/#faq", "FAQ"],
  ["/track", "Track Order"],
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartN = useCart()?.length ?? 0;
  const close = () => setMenuOpen(false);

  const links = NAV.map(([href, label]) => (
    <Link key={href} href={href} onClick={close} aria-current={pathname === href ? "page" : undefined}>
      {label}
    </Link>
  ));

  return (
    <header className="site-hd">
      <div className="wrap hd-row">
        <Link className="logo" href="/" onClick={close} aria-label="Sticker Status Direct home">
          <LogoMark />
          <span className="logo-word">
            <b>Sticker Status</b>
            <i>DIRECT</i>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Main">
          {links}
        </nav>
        <div className="hd-tools">
          <Link className="icon-btn" href="/account" aria-label="Account">
            <Icon name="user" size={21} />
          </Link>
          <Link className="icon-btn" href="/cart" aria-label={`Cart, ${cartN} item${cartN === 1 ? "" : "s"}`}>
            <Icon name="cart" size={21} />
            {cartN ? <span className="badge">{cartN}</span> : null}
          </Link>
          <Link className="btn btn-red btn-sm hd-cta" href="/stickers">
            Order Stickers
          </Link>
          <button className="icon-btn burger" onClick={() => setMenuOpen((m) => !m)} aria-label="Menu" aria-expanded={menuOpen}>
            <Icon name={menuOpen ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav className="mobile-nav wrap" aria-label="Mobile">
          {links}
          <Link href="/account" onClick={close}>
            Account
          </Link>
          <div style={{ paddingTop: 16 }}>
            <Link className="btn btn-red btn-block" href="/stickers" onClick={close}>
              Order Stickers
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
