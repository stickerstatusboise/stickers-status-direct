import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountInfoForm } from "@/components/account/AccountInfoForm";
import { OrderCard } from "@/components/account/OrderCard";
import { SignOutButton } from "@/components/account/SignOutButton";
import { StaffViewAs } from "@/components/account/StaffViewAs";
import { OrderItemSticker } from "@/components/order/ItemSticker";
import { ProofPill, StatusPill } from "@/components/order/StatusPill";
import { Icon } from "@/components/ui/Icon";
import { getProduct, type ArtKey } from "@/lib/catalog";
import { fmtDate, fmtDT, trackUrl } from "@/lib/format";
import { getDb } from "@/server/db/client";
import { customers } from "@/server/db/schema";
import { isStaff } from "@/server/auth/customers";
import { requireCustomer } from "@/server/auth/session";
import { listCustomersWithOrders, listOrdersForCustomer } from "@/server/queries";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const TABS = [
  ["orders", "Orders"],
  ["proofs", "Proofs"],
  ["tracking", "Tracking"],
  ["info", "Account info"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const sp = await searchParams;
  const viewer = await requireCustomer("/account");
  const db = getDb();
  const staff = isStaff(viewer);

  // Staff can look at a customer's account the way the customer sees it
  const asId = staff && typeof sp.as === "string" && /^[0-9a-f-]{36}$/i.test(sp.as) ? sp.as : undefined;
  const [subject] = asId ? await db.select().from(customers).where(eq(customers.id, asId)) : [viewer];
  const me = subject ?? viewer;
  const viewingOther = me.id !== viewer.id;

  const tab: Tab = TABS.some(([t]) => t === sp.tab) ? (sp.tab as Tab) : "orders";
  const [orders, staffCustomers] = await Promise.all([listOrdersForCustomer(db, me.id), staff ? listCustomersWithOrders(db) : Promise.resolve([])]);
  const pending = orders.filter((o) => o.order.status === "proof_ready");
  const proofs = orders
    .flatMap((o) => o.proofs.map((p) => ({ o, p })))
    .sort((a, b) => b.p.sentAt.getTime() - a.p.sentAt.getTime());
  const shipped = orders.filter((o) => o.shipment);
  const counts: Partial<Record<Tab, number>> = { orders: orders.length, proofs: proofs.length, tracking: shipped.length };
  const tabHref = (t: Tab) => `/account?${new URLSearchParams({ ...(asId ? { as: asId } : {}), ...(t !== "orders" ? { tab: t } : {}) })}`;

  return (
    <div className="wrap">
      <div className="acct-hd">
        <div>
          <span className="eyebrow">{viewingOther ? "Viewing as customer" : "Your account"}</span>
          <h1>Hey, {me.name.split(" ")[0]}</h1>
        </div>
        <div className="row">
          <Link className="btn btn-red" href="/stickers">
            Order Stickers
          </Link>
          <SignOutButton />
        </div>
      </div>

      {staff ? <StaffViewAs customers={staffCustomers} current={asId} /> : null}

      {pending.map((o) => (
        <div key={o.order.id} className="alert" role="status">
          <Icon name="bell" size={26} />
          <div>
            <h3>Your proof is ready!</h3>
            <p>
              {o.order.number} · Proof v{o.proofs.at(-1)?.version} is waiting for your approval.
            </p>
          </div>
          <Link className="btn" href={`/account/orders/${o.order.number}#proof`}>
            Review proof
          </Link>
        </div>
      ))}

      <div className="tabs" role="tablist">
        {TABS.map(([t, label]) => (
          <Link key={t} href={tabHref(t)} role="tab" aria-selected={tab === t} scroll={false}>
            {label}
            {counts[t] != null ? <span className="cnt">{counts[t]}</span> : null}
          </Link>
        ))}
      </div>

      <div className="ocards">
        {tab === "orders" ? (
          orders.length ? (
            orders.map((o) => <OrderCard key={o.order.id} o={o} />)
          ) : (
            <div className="card empty">
              <h2>No orders yet</h2>
              <Link className="btn btn-red btn-lg" href="/stickers">
                Order Stickers
              </Link>
            </div>
          )
        ) : null}

        {tab === "proofs" ? (
          proofs.length ? (
            proofs.map(({ o, p }) => {
              const it = o.items[0];
              return (
                <article key={p.id} className="ocard">
                  <div className="art">{it ? <OrderItemSticker item={it} art={(p.file?.sampleArt as ArtKey | null) ?? o.art} /> : null}</div>
                  <div>
                    <div className="row" style={{ gap: 10 }}>
                      <h3>Proof v{p.version}</h3>
                      <ProofPill status={p.status} />
                    </div>
                    <p className="meta">
                      {o.order.number} · {it ? getProduct(it.productId).name : ""} · sent {fmtDT(p.sentAt)}
                      {p.respondedAt ? ` · you responded ${fmtDT(p.respondedAt)}` : ""}
                    </p>
                    {p.customerNote ? (
                      <p className="small">
                        Your note: <i>“{p.customerNote}”</i>
                      </p>
                    ) : null}
                  </div>
                  <div className="acts">
                    <Link className={`btn ${p.status === "pending" ? "btn-red" : "btn-line"}`} href={`/account/orders/${o.order.number}#proof`}>
                      {p.status === "pending" ? "Review proof" : "Open"}
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="card empty">
              <h2>No proofs yet</h2>
              <p className="muted">Proofs appear here after you order.</p>
            </div>
          )
        ) : null}

        {tab === "tracking" ? (
          shipped.length ? (
            shipped.map((o) => {
              const s = o.shipment!;
              return (
                <article key={o.order.id} className="card">
                  <div className="row">
                    <h3 className="mono" style={{ fontFamily: "var(--mono)", textTransform: "none", fontSize: 17, margin: 0 }}>
                      {o.order.number}
                    </h3>
                    <StatusPill status={o.order.status} />
                    <span className="spacer" />
                    {o.order.status === "shipped" ? (
                      <a className="btn btn-red btn-sm" href={trackUrl(s.carrier, s.trackingNumber)} target="_blank" rel="noopener noreferrer">
                        <Icon name="truck" size={16} /> Track package
                      </a>
                    ) : null}
                  </div>
                  <div className="ship-box" style={{ margin: "16px 0 0" }}>
                    <div>
                      <span>Carrier</span>
                      <b>{s.carrier}</b>
                    </div>
                    <div>
                      <span>Tracking #</span>
                      <b className="mono">{s.trackingNumber}</b>
                    </div>
                    <div>
                      <span>Ship date</span>
                      <b>{fmtDate(s.shippedAt)}</b>
                    </div>
                    <div>
                      <span>{s.deliveredAt ? "Delivered" : "Est. delivery"}</span>
                      <b>{s.deliveredAt ? fmtDate(s.deliveredAt) : s.eta ? fmtDate(s.eta) : "—"}</b>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="card empty">
              <h2>Nothing shipped yet</h2>
            </div>
          )
        ) : null}

        {tab === "info" ? <AccountInfoForm me={me} readOnly={viewingOther} /> : null}
      </div>
    </div>
  );
}
