import Link from "next/link";
import { OrderItemSticker } from "@/components/order/ItemSticker";
import { StatusPill } from "@/components/order/StatusPill";
import { Tracker } from "@/components/order/Tracker";
import { Icon } from "@/components/ui/Icon";
import { getMaterial, getProduct } from "@/lib/catalog";
import { inch } from "@/lib/config";
import { fmtDate, fmtQty, money, trackUrl } from "@/lib/format";
import type { OrderSummary } from "@/server/queries";

export function OrderCard({ o }: { o: OrderSummary }) {
  const it = o.items[0];
  const n = o.order.number;
  const href = `/account/orders/${n}`;
  const proofReady = o.order.status === "proof_ready";
  return (
    <article className="ocard">
      <div className="art">{it ? <OrderItemSticker item={it} art={o.art} label={n} /> : null}</div>
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 10 }}>
          <h3 className="mono" style={{ fontFamily: "var(--mono)", fontSize: 17, textTransform: "none" }}>
            {n}
          </h3>
          <StatusPill status={o.order.status} />
        </div>
        {it ? (
          <>
            <h3 style={{ marginTop: 6 }}>
              {getProduct(it.productId).name}
              {o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
            </h3>
            <p className="meta">
              {fmtQty(it.qty)} · {inch(it.widthIn)} × {inch(it.heightIn)} · {getMaterial(it.material).name} · Ordered {fmtDate(o.order.createdAt)} ·{" "}
              {money(o.order.totalCents)}
            </p>
          </>
        ) : null}
        <Tracker
          compact
          data={{ number: n, status: o.order.status, prodStage: o.order.prodStage, dueAt: o.order.dueAt, stageTimes: [], shipment: o.shipment }}
        />
      </div>
      <div className="acts">
        {proofReady ? (
          <Link className="btn btn-red" href={`${href}#proof`}>
            Review proof
          </Link>
        ) : null}
        <Link className={`btn ${proofReady ? "btn-line" : "btn-ink"}`} href={href}>
          View order
        </Link>
        {o.shipment && o.order.status === "shipped" ? (
          <a className="btn btn-line" href={trackUrl(o.shipment.carrier, o.shipment.trackingNumber)} target="_blank" rel="noopener noreferrer">
            <Icon name="truck" size={16} /> Track package
          </a>
        ) : null}
      </div>
    </article>
  );
}
