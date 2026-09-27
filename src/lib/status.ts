/**
 * Order statuses, admin labels and the 8 customer tracker stages. Lifted from the prototype.
 * Not used by the storefront yet; orders, the tracker and admin arrive in steps 2–3.
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
};

export const PROD_STEPS = ["Queued", "Printing", "Laminating", "Cutting"] as const;
