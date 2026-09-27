import { fmtDT, fmtShort, trackUrl } from "@/lib/format";
import { PROD_STAGE_LABEL, STAGE_OF, STAGES, type OrderStatus, type ProdStage } from "@/lib/status";
import { Icon } from "@/components/ui/Icon";

export interface TrackerData {
  number: string;
  status: OrderStatus;
  prodStage: ProdStage | null;
  dueAt: Date | null;
  stageTimes: (Date | null)[];
  shipment: { carrier: string; trackingNumber: string; eta: Date | null } | null;
}

function stageMsg(t: TrackerData): [string, string] {
  const due = t.dueAt ? fmtShort(t.dueAt) : "soon";
  const s = t.shipment;
  switch (t.status) {
    case "received":
      return ["We got your order", "Our team will review your artwork within 1 business day."];
    case "review":
      return ["Checking your artwork", "A real person is checking resolution, size and cut lines."];
    case "proof_ready":
      return ["Your proof is ready", "Approve it or ask for changes. Nothing prints until you approve."];
    case "changes_requested":
      return ["Revising your proof", "We got your notes. A revised proof is on the way."];
    case "approved":
      return ["Proof approved", `You're in the print queue. Target print date ${due}.`];
    case "production":
      return ["Printing now", `On the floor: ${PROD_STAGE_LABEL[t.prodStage ?? "queued"]}. Target finish ${due}.`];
    case "qc":
      return ["Quality check", "Every sheet gets inspected for color, cut and count before it ships."];
    case "ready_to_ship":
      return ["Packed & ready", "Boxed, labeled and waiting on the carrier pickup."];
    case "shipped":
      return ["On the way", s ? `${s.carrier}${s.eta ? ` · estimated delivery ${fmtShort(s.eta)}` : ""}` : "Your stickers are with the carrier."];
    case "delivered":
      return ["Delivered", "Enjoy! Need more? Reorder anytime."];
    case "cancelled":
      return ["Order cancelled", "This order was cancelled. Questions? Contact the shop."];
  }
}

/** The 8-stage order tracker: horizontal on desktop, vertical on mobile. `compact` is the thin bar on order cards. */
export function Tracker({ data, compact = false, action }: { data: TrackerData; compact?: boolean; action?: React.ReactNode }) {
  const idx = STAGE_OF[data.status];
  if (idx < 0) return compact ? null : <div className="trk-cancel">This order was cancelled.</div>;
  const done = data.status === "delivered";
  const [title, sub] = stageMsg(data);
  const s = data.shipment;
  return (
    <div className={`trk ${compact ? "compact" : ""}`} role="group" aria-label={`Order progress: ${STAGES[idx]}`}>
      <div className="trk-head">
        <div>
          <p className="trk-stage">
            {done ? null : <span className="live" />}STAGE {idx + 1} OF 8 · {data.number}
          </p>
          <h2 className="trk-title">{title}</h2>
          <p className="trk-sub">{sub}</p>
        </div>
        {action}
        {data.status === "shipped" && s ? (
          <a className="btn btn-red" href={trackUrl(s.carrier, s.trackingNumber)} target="_blank" rel="noopener noreferrer">
            <Icon name="truck" size={18} /> Track package
          </a>
        ) : null}
      </div>
      <ol className="trk-steps">
        {STAGES.map((label, i) => {
          const when = i <= idx ? data.stageTimes[i] : null;
          return (
            <li key={label} className={`${i < idx || done ? "is-done" : ""} ${i === idx && !done ? "is-now" : ""}`} style={{ ["--i" as string]: i }}>
              <span className="led" />
              <span className="lbl">
                {label}
                {when ? <span className="when">{fmtDT(when)}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
