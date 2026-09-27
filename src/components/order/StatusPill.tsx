import { STATUS, type OrderStatus } from "@/lib/status";

export function StatusPill({ status, who = "cust" }: { status: OrderStatus; who?: "cust" | "admin" }) {
  return (
    <span className="pill" data-tone={STATUS[status].tone}>
      {STATUS[status][who]}
    </span>
  );
}

export function ProofPill({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="pill" data-tone="go">
        Approved
      </span>
    );
  if (status === "changes_requested")
    return (
      <span className="pill" data-tone="wait">
        Changes requested
      </span>
    );
  if (status === "superseded")
    return (
      <span className="pill" data-tone="done">
        Replaced
      </span>
    );
  return (
    <span className="pill" data-tone="attn">
      Awaiting you
    </span>
  );
}
