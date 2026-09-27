/**
 * Order statuses, admin labels, the 8 customer tracker stages and the rules for moving between statuses.
 * Labels and stages are lifted from the prototype; "cancelled" was added for real-world use.
 */

export const STATUS = {
  received: { admin: "New Order", cust: "Order received", tone: "attn" },
  review: { admin: "Artwork Review", cust: "Artwork review", tone: "wait" },
  proof_ready: { admin: "Awaiting Approval", cust: "Proof ready", tone: "attn" },
  changes_requested: { admin: "Changes Requested", cust: "Revising proof", tone: "wait" },
  approved: { admin: "Approved", cust: "Proof approved", tone: "go" },
  production: { admin: "In Production", cust: "In production", tone: "work" },
  qc: { admin: "Quality Check", cust: "Quality check", tone: "work" },
  ready_to_ship: { admin: "Ready to Ship", cust: "Packed", tone: "go" },
  shipped: { admin: "Shipped", cust: "Shipped", tone: "go" },
  delivered: { admin: "Completed", cust: "Delivered", tone: "done" },
  cancelled: { admin: "Cancelled", cust: "Cancelled", tone: "done" },
} as const;

export type OrderStatus = keyof typeof STATUS;

export const STAGES = [
  "Order Received",
  "Artwork Review",
  "Proof Ready",
  "Proof Approved",
  "In Production",
  "Quality Check",
  "Shipped",
  "Delivered",
] as const;

/** Tracker stage (0–7) for each status. Cancelled orders aren't on the tracker (-1). */
export const STAGE_OF: Record<OrderStatus, number> = {
  received: 0,
  review: 1,
  proof_ready: 2,
  changes_requested: 2,
  approved: 3,
  production: 4,
  qc: 5,
  ready_to_ship: 5,
  shipped: 6,
  delivered: 7,
  cancelled: -1,
};

/** Production sub-steps (staff only; the customer tracker just shows "In production"). */
export const PROD_STAGES = ["queued", "printing", "laminating", "cutting"] as const;
export type ProdStage = (typeof PROD_STAGES)[number];
export const PROD_STAGE_LABEL: Record<ProdStage, string> = { queued: "Queued", printing: "Printing", laminating: "Laminating", cutting: "Cutting" };

/**
 * Allowed status changes. Some can only happen through their own action, because they need more than a status change:
 * proof_ready (sendProof: needs a proof), changes_requested (customer's note), approved (approveProof: locks the proof,
 * sets the due date and moves straight to production), shipped (needs tracking).
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ["review", "proof_ready", "cancelled"],
  review: ["proof_ready", "cancelled"],
  proof_ready: ["changes_requested", "approved", "cancelled"],
  changes_requested: ["proof_ready", "cancelled"],
  approved: ["production", "cancelled"],
  production: ["qc", "cancelled"],
  qc: ["ready_to_ship", "production"],
  ready_to_ship: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const ACTION_ONLY: OrderStatus[] = ["proof_ready", "changes_requested", "approved", "shipped"];

export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

/** Default activity-log text for a status change. */
export const LOG_TEXT: Record<OrderStatus, string> = {
  received: "Order placed online",
  review: "Artwork review started",
  proof_ready: "Proof sent to customer",
  changes_requested: "Customer requested changes",
  approved: "Customer approved proof",
  production: "Moved to production queue",
  qc: "Quality check started",
  ready_to_ship: "Packed and labeled",
  shipped: "Handed to carrier",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};

/**
 * Customer notifications (bell + email) for customer-facing changes. Statuses the customer caused themselves
 * (approved, changes_requested) and behind-the-scenes steps (review, ready_to_ship) don't notify.
 */
export const CUSTOMER_NOTICE: Partial<Record<OrderStatus, (orderNumber: string) => { title: string; body: string }>> = {
  received: (n) => ({ title: "Order received", body: `We got ${n}. Your proof is next.` }),
  proof_ready: (n) => ({ title: "Your proof is ready!", body: `A proof for ${n} is waiting for your approval.` }),
  production: (n) => ({ title: "In production", body: `${n} is on the press.` }),
  qc: (n) => ({ title: "Quality check", body: `${n} is getting a final inspection.` }),
  shipped: (n) => ({ title: "Your stickers shipped", body: `${n} is on the way.` }),
  delivered: (n) => ({ title: "Delivered!", body: `${n} was delivered. Need more? Reorder anytime.` }),
  cancelled: (n) => ({ title: "Order cancelled", body: `${n} was cancelled. Questions? Reply to this email.` }),
};
