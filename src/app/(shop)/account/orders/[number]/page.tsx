import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderItemSticker } from "@/components/order/ItemSticker";
import { OrderItemSpecs } from "@/components/order/OrderItemSpecs";
import { ProofActions } from "@/components/order/ProofActions";
import { ProofSheet } from "@/components/order/ProofSheet";
import { ProofPill } from "@/components/order/StatusPill";
import { Tracker } from "@/components/order/Tracker";
import { Icon } from "@/components/ui/Icon";
import { getProduct, getShipping, type ArtKey } from "@/lib/catalog";
import { fmtDate, fmtDT, fmtDTfull, money, trackUrl } from "@/lib/format";
import { getDb } from "@/server/db/client";
import { requireCustomer } from "@/server/auth/session";
import { canViewOrder, getOrderDetail, stageTimes } from "@/server/queries";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function OrderPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const viewer = await requireCustomer(`/account/orders/${number}`);
  const d = await getOrderDetail(getDb(), number);
  // Someone else's order looks exactly like a missing one
  if (!d || !canViewOrder(viewer, d.order)) notFound();

  const { order: o, items, proofs, shipment: s } = d;
  const isOwner = viewer.id === o.customerId;
  const cur = proofs.at(-1);
  const approved = proofs.find((p) => p.status === "approved");
  const shown = approved ?? cur;
  const first = items[0];
  const proofArt = (p: typeof cur) => ((p?.file?.sampleArt as ArtKey | null) ?? d.art) || null;
  const ship = getShipping(o.shipMethod);

  let proofBody: React.ReactNode;
  if (!cur || !shown || !first) {
    proofBody = <p className="muted">Your proof will appear here, usually within 1 business day. We&apos;ll notify you by email and in your account.</p>;
  } else {
    let acts: React.ReactNode;
    if (approved)
      acts = (
        <div className="approved-lock">
          <Icon name="lock" size={22} />
          <div>
            Proof v{approved.version} approved and locked for production
            <small>Approved {approved.respondedAt ? fmtDTfull(approved.respondedAt) : ""}</small>
          </div>
        </div>
      );
    else if (cur.status === "pending" && o.status === "proof_ready")
      acts = <ProofActions number={o.number} disabledReason={isOwner ? undefined : "Staff view: only the customer can approve or request changes."} />;
    else acts = <div className="note">We&apos;re working on your changes. A revised proof will show up here and you&apos;ll get a notification.</div>;

    proofBody = (
      <>
        {cur.staffMessage && !approved ? (
          <p style={{ marginBottom: 14 }}>
            <b>From the Sticker Status team:</b> {cur.staffMessage}
          </p>
        ) : null}
        <div className="proof-wrap">
          <ProofSheet orderNumber={o.number} version={shown.version} sentAt={shown.sentAt} art={proofArt(shown)} item={first} />
          {acts}
          {proofs.length > 1 || proofs[0].customerNote ? (
            <div>
              <h3>Proof history</h3>
              <div className="pv-list">
                {[...proofs].reverse().map((p) => (
                  <div key={p.id} className="pv">
                    <span className="pvn">v{p.version}</span>
                    <div>
                      <b>{p.status === "approved" ? "Approved" : p.status === "changes_requested" ? "Changes requested" : p.status === "superseded" ? "Replaced" : "Waiting for you"}</b>{" "}
                      · <span className="muted small">sent {fmtDT(p.sentAt)}</span>
                      {p.customerNote ? <q>“{p.customerNote}”</q> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="wrap">
      <div style={{ paddingTop: 28 }}>
        <div className="crumbs">
          <Link href="/account">Account</Link>
          <span>/</span>
          <span>{o.number}</span>
        </div>
      </div>
      {!isOwner ? (
        <div className="staff-note" style={{ marginTop: 12 }}>
          Staff view of {o.name}&apos;s order. This is what the customer sees; their buttons are disabled for you.
        </div>
      ) : null}
      <div className="acct-hd" style={{ paddingTop: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)" }}>Order {o.number}</h1>
          <p className="muted">
            Placed {fmtDate(o.createdAt)} · {money(o.totalCents)}
          </p>
        </div>
      </div>

      <Tracker
        data={{ number: o.number, status: o.status, prodStage: o.prodStage, dueAt: o.dueAt, stageTimes: stageTimes(d.events), shipment: s }}
        action={
          o.status === "proof_ready" ? (
            <a className="btn btn-red" href="#proof">
              Review proof
            </a>
          ) : null
        }
      />

      <div className="od-grid">
        <div>
          <div className="card" id="proof">
            <div className="row" style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Your proof</h2>
              {shown ? <ProofPill status={shown.status} /> : null}
            </div>
            {proofBody}
          </div>
          <div className="card">
            <h2>Items</h2>
            {items.map((it) => (
              <div key={it.id} className="citem" style={{ gridTemplateColumns: "100px minmax(0,1fr)" }}>
                <div className="art">
                  <OrderItemSticker item={it} art={it === first ? d.art : null} />
                </div>
                <div>
                  <h3>{getProduct(it.productId).name}</h3>
                  <OrderItemSpecs item={it} files={d.files} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          {s ? (
            <div className="card">
              <h2>Shipping</h2>
              <div className="ship-box">
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
              <a className="btn btn-red btn-block" href={trackUrl(s.carrier, s.trackingNumber)} target="_blank" rel="noopener noreferrer">
                <Icon name="truck" size={18} /> Track package
              </a>
            </div>
          ) : null}
          <div className="card">
            <h2>Summary</h2>
            <div className="sumlines">
              <div>
                <span>Subtotal</span>
                <span className="num">{money(o.subtotalCents)}</span>
              </div>
              <div>
                <span>Shipping ({ship.name})</span>
                <span className="num">{o.shippingCents ? money(o.shippingCents) : "FREE"}</span>
              </div>
              <div>
                <span>Tax</span>
                <span className="num">{money(o.taxCents)}</span>
              </div>
              <div className="tot">
                <span>Total</span>
                <span className="num">{money(o.totalCents)}</span>
              </div>
            </div>
            {o.cardLast4 ? (
              <p className="small muted" style={{ marginTop: 12 }}>
                {o.cardBrand} ending {o.cardLast4} · {o.paymentStatus === "paid" ? "Paid" : o.paymentStatus}
              </p>
            ) : null}
          </div>
          <div className="card">
            <h2>Ship to</h2>
            <p>
              {o.name}
              <br />
              {o.shipAddress.line1}
              {o.shipAddress.line2 ? `, ${o.shipAddress.line2}` : ""}
              <br />
              {o.shipAddress.city}, {o.shipAddress.state} {o.shipAddress.zip}
            </p>
          </div>
          <div className="card">
            <h2>Activity</h2>
            <ol className="timeline">
              {[...d.events].reverse().map((e) => (
                <li key={e.id}>
                  <span>
                    {e.text}
                    <small>{fmtDT(e.createdAt)}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
