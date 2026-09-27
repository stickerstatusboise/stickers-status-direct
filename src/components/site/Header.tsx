"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MeResponse } from "@/app/api/me/route";
import { useCart } from "@/components/cart/cart-store";
import { Icon } from "@/components/ui/Icon";
import { fmtDT } from "@/lib/format";
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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [me, setMe] = useState<MeResponse>({ signedIn: false });
  const bellRef = useRef<HTMLDivElement>(null);
  const cartN = useCart()?.length ?? 0;
  const close = () => setMenuOpen(false);

  // Refresh sign-in state and notifications on every page change
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((d: MeResponse) => alive && setMe(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!bellOpen) return;
    const onDown = (e: MouseEvent) => !bellRef.current?.contains(e.target as Node) && setBellOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBellOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

  const notes = me.notifications ?? [];
  const unread = notes.filter((n) => !n.read).length;
  const openNote = (n: (typeof notes)[number]) => {
    setBellOpen(false);
    setMe((m) => ({ ...m, notifications: m.notifications?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
    fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
    router.push(n.orderNumber ? `/account/orders/${n.orderNumber}#proof` : "/account");
  };

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
          {me.signedIn ? (
            <div className="bell-wrap" ref={bellRef}>
              <button
                className="icon-btn"
                onClick={() => setBellOpen((b) => !b)}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                aria-expanded={bellOpen}
              >
                <Icon name="bell" size={21} />
                {unread ? <span className="badge">{unread}</span> : null}
              </button>
              {bellOpen ? (
                <div className="bell-pop" role="dialog" aria-label="Notifications" style={{ right: 0, top: 50 }}>
                  <h4>Notifications</h4>
                  {notes.length ? (
                    notes.map((n) => (
                      <button key={n.id} className={`bell-item ${n.read ? "read" : ""}`} onClick={() => openNote(n)}>
                        <span className="bell-dot" />
                        <span>
                          <b>{n.title}</b>
                          <br />
                          <span className="small muted">
                            {n.body} · {fmtDT(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p style={{ padding: 16 }} className="muted">
                      Nothing yet.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <Link className="icon-btn" href="/account" aria-label={me.signedIn ? "Your account" : "Sign in"}>
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
