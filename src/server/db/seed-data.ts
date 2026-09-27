/**
 * Sample data from the prototype (docs/prototype.html, seed()): 12 customers and 15 orders covering every status,
 * with proofs, notes, tracking and notifications. Times are relative to "now" so the demo always looks current.
 * Pure: builds plain objects; seed.ts writes them to the database.
 */
import type { ArtKey, MaterialId, ShapeId } from "@/lib/catalog";
import { getShipping } from "@/lib/catalog";
import { dims, newConfig, type StickerConfig } from "@/lib/config";
import { dueDateAfterApproval } from "@/lib/dates";
import { calculatePrice, cartTotals, PRICING_VERSION, type PriceLine } from "@/lib/pricing";
import { LOG_TEXT, type OrderStatus, type ProdStage } from "@/lib/status";
import type { Address } from "./schema";

export interface SeedCustomer {
  key: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  address: Address;
  createdAt: Date;
}
export interface SeedFile {
  name: string;
  sizeBytes: number;
  ext: string;
  art: ArtKey;
}
export interface SeedItem {
  cfg: StickerConfig;
  widthIn: number;
  heightIn: number;
  priceCents: number;
  priceLines: PriceLine[];
  pricingVersion: string;
  file: SeedFile;
}
export interface SeedEvent {
  at: Date;
  status: OrderStatus | null;
  text: string;
  actorName: string;
}
export interface SeedProof {
  version: number;
  art: ArtKey;
  sentAt: Date;
  status: "pending" | "approved" | "changes_requested";
  note: string | null;
  respondedAt: Date | null;
  staffMessage: string;
}
export interface SeedOrder {
  number: string;
  customerKey: string;
  createdAt: Date;
  status: OrderStatus;
  prodStage: ProdStage | null;
  isRush: boolean;
  approvedAt: Date | null;
  dueAt: Date | null;
  shipMethod: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  items: SeedItem[];
  events: SeedEvent[];
  proofs: SeedProof[];
  notes: { at: Date; authorName: string; text: string }[];
  shipment: { carrier: string; trackingNumber: string; shippedAt: Date; eta: Date; deliveredAt: Date | null } | null;
}
export interface SeedNotification {
  customerKey: string;
  orderNumber: string;
  kind: string;
  title: string;
  body: string;
  at: Date;
  read: boolean;
}
export interface SeedData {
  customers: SeedCustomer[];
  orders: SeedOrder[];
  notifications: SeedNotification[];
}

const FLOW: OrderStatus[] = ["received", "review", "proof_ready", "approved", "production", "qc", "ready_to_ship", "shipped", "delivered"];

export function buildSeed(now = new Date()): SeedData {
  const H = 36e5;
  const D = 24 * H;
  const t = now.getTime();
  const ago = (d: number, h = 0) => new Date(t - d * D - h * H);
  const fut = (d: number) => new Date(t + d * D);
  const addr = (line1: string, city: string, zip: string, line2 = ""): Address => ({ line1, line2, city, state: "ID", zip });

  const C = (key: string, name: string, company: string | null, email: string, phone: string, address: Address, createdAt: Date): SeedCustomer => ({
    key,
    name,
    company,
    email,
    phone,
    address,
    createdAt,
  });
  const customers = [
    C("jordan", "Jordan Reyes", null, "jordan@example.com", "(208) 555-0142", addr("1420 W Main St", "Boise", "83702", "Apt 3"), ago(40)),
    C("maya", "Maya Chen", "Boise Brew Co.", "maya@boisebrew.example", "(208) 555-0187", addr("310 S 5th St", "Boise", "83702"), ago(30)),
    C("luis", "Luis Ortega", "Treasure Valley Tint", "luis@tvtint.example", "(208) 555-0110", addr("8850 W Fairview Ave", "Boise", "83704"), ago(30)),
    C("dana", "Dana Whitfield", "Owyhee Moto Club", "dana@owyheemoto.example", "(208) 555-0163", addr("22 Pleasant Valley Rd", "Kuna", "83634"), ago(30)),
    C("priya", "Priya Nair", "Ridge Line Coffee", "priya@ridgeline.example", "(208) 555-0121", addr("1600 N 13th St", "Boise", "83702"), ago(30)),
    C("ben", "Ben Carter", "Sawtooth Supply", "ben@sawtoothsupply.example", "(208) 555-0199", addr("515 E Park Blvd", "Boise", "83712"), ago(30)),
    C("alex", "Alex Moreno", "Capital City Cycling", "alex@cccycling.example", "(208) 555-0133", addr("2300 W Fairview Ave", "Boise", "83702"), ago(30)),
    C("tessa", "Tessa Grant", "Foothills Fitness", "tessa@foothillsfit.example", "(208) 555-0176", addr("4700 W State St", "Boise", "83703"), ago(30)),
    C("sam", "Sam Lee", "North End Records", "sam@northendrecords.example", "(208) 555-0104", addr("1512 N 13th St", "Boise", "83702"), ago(30)),
    C("chris", "Chris Patel", "Bogus Basin Riders", "chris@bbriders.example", "(208) 555-0158", addr("9 Bogus Basin Rd", "Boise", "83702"), ago(30)),
    C("elena", "Elena Ruiz", "Hyde Park Bakery", "elena@hydeparkbakery.example", "(208) 555-0145", addr("1520 N 13th St", "Boise", "83702"), ago(30)),
    C("jake", "Jake Morrison", null, "jake.morrison@example.com", "(208) 555-0190", addr("77 Canyon Rd", "Meridian", "83642"), ago(30)),
  ];

  const item = (
    productId: string,
    shape: ShapeId,
    size: number,
    qty: number,
    material: MaterialId,
    art: ArtKey,
    o: { laminate?: boolean; rush?: boolean; designHelp?: boolean; designNotes?: string; file?: string; fsize?: number } = {},
  ): SeedItem => {
    const cfg: StickerConfig = {
      ...newConfig(productId),
      shape,
      size,
      qty,
      material,
      options: { laminate: !!o.laminate, rush: !!o.rush },
      designHelp: !!o.designHelp,
      designNotes: o.designNotes ?? "",
    };
    const d = dims(cfg);
    const price = calculatePrice(cfg);
    const name = o.file ?? `${art}-artwork.ai`;
    return {
      cfg,
      widthIn: d.w,
      heightIn: d.h,
      priceCents: price.totalCents,
      priceLines: price.lines,
      pricingVersion: PRICING_VERSION,
      file: { name, sizeBytes: o.fsize ?? 1840000, ext: name.split(".").pop()!.toLowerCase(), art },
    };
  };

  const orders: SeedOrder[] = [];
  const O = (
    number: string,
    customerKey: string,
    createdAt: Date,
    status: OrderStatus,
    items: SeedItem[],
    extra: { prodStage?: ProdStage; carrier?: string; tn?: string; eta?: Date } = {},
  ): SeedOrder => {
    const subtotal = items.reduce((s, i) => s + i.priceCents, 0);
    const totals = cartTotals(subtotal, getShipping("standard"));
    const target = status === "changes_requested" ? "proof_ready" : status;
    const n = FLOW.indexOf(target);
    const start = createdAt.getTime();
    const end = t - 25 * 60e3;
    const step = (end - start) / Math.max(n + 0.5, 1);
    const events: SeedEvent[] = [];
    for (let i = 0; i <= n; i++) {
      const s = FLOW[i];
      events.push({
        at: new Date(start + step * i),
        status: s,
        text: s === "proof_ready" ? "Proof v1 sent to customer" : s === "approved" ? "Customer approved proof v1" : LOG_TEXT[s],
        actorName: i === 0 || s === "approved" ? "Customer" : "Staff",
      });
    }
    const at = (s: OrderStatus) => events.find((e) => e.status === s)!.at;
    const isRush = items.some((i) => i.cfg.options.rush);
    const o: SeedOrder = {
      number,
      customerKey,
      createdAt,
      status,
      prodStage: status === "production" ? (extra.prodStage ?? "printing") : null,
      isRush,
      approvedAt: null,
      dueAt: null,
      shipMethod: "standard",
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      items,
      events,
      proofs: [],
      notes: [],
      shipment: null,
    };
    if (n >= 2)
      o.proofs.push({
        version: 1,
        art: items[0].file.art,
        sentAt: at("proof_ready"),
        status: n >= 3 ? "approved" : "pending",
        note: null,
        respondedAt: n >= 3 ? at("approved") : null,
        staffMessage: "Here is your proof. Check spelling, colors and size.",
      });
    if (n >= 3) {
      o.approvedAt = at("approved");
      o.dueAt = dueDateAfterApproval(o.approvedAt, isRush);
    }
    if (n >= 7) {
      const shippedAt = at("shipped");
      o.shipment = {
        carrier: extra.carrier ?? "USPS",
        trackingNumber: extra.tn!,
        shippedAt,
        eta: status === "delivered" ? at("delivered") : (extra.eta ?? dueDateAfterApproval(shippedAt, false)),
        deliveredAt: status === "delivered" ? at("delivered") : null,
      };
    }
    orders.push(o);
    return o;
  };

  O("SSD-1039", "chris", ago(26), "delivered", [item("square", "square", 4, 100, "gloss", "peak")], { carrier: "USPS", tn: "9400111899223344556677" });
  O("SSD-1041", "jordan", ago(21), "delivered", [item("die-cut", "diecut", 3, 250, "gloss", "bolt", { file: "bolt-logo-final.ai" })], {
    carrier: "UPS",
    tn: "1Z999AA10123456784",
  });
  O("SSD-1044", "sam", ago(9), "shipped", [item("holographic", "diecut", 3, 250, "holo", "star")], { carrier: "USPS", tn: "9400111899223377881122", eta: fut(1) });
  O("SSD-1046", "jordan", ago(7), "shipped", [item("circle", "circle", 2, 500, "holo", "peak", { file: "boise-peak.svg" })], {
    carrier: "USPS",
    tn: "9400111899223300112233",
    eta: fut(2),
  });
  const o47 = O("SSD-1047", "tessa", ago(6), "ready_to_ship", [item("square", "square", 3, 500, "matte", "sun")]);
  const o49 = O("SSD-1049", "alex", ago(5), "qc", [item("circle", "circle", 2, 2500, "gloss", "bolt")]);
  const o50 = O("SSD-1050", "ben", ago(5, 3), "production", [item("clear", "diecut", 5, 1000, "clear", "peak", { laminate: true })], { prodStage: "cutting" });
  const o52 = O(
    "SSD-1052",
    "jordan",
    ago(4),
    "production",
    [item("rectangle", "rect", 4, 100, "matte", "sendit", { laminate: true, file: "send-it-bumper.pdf" })],
    { prodStage: "printing" },
  );
  const o53 = O("SSD-1053", "dana", ago(3, 4), "changes_requested", [item("oval", "oval", 3, 250, "gloss", "flame")]);
  const o54 = O("SSD-1054", "priya", ago(2, 6), "approved", [item("square", "square", 3, 500, "matte", "sun", { rush: true })]);
  O("SSD-1056", "elena", ago(1, 8), "proof_ready", [item("oval", "oval", 3, 250, "gloss", "sun")]);
  const o57 = O("SSD-1057", "jordan", ago(3), "proof_ready", [
    item("die-cut", "diecut", 3, 100, "gloss", "fuel-v1", {
      designHelp: true,
      designNotes: "Coffee cup logo for my detailing van. Steam coming off the top and the word FUEL on the cup. Keep it bold so it reads from across the lot.",
      file: "napkin-sketch.jpg",
      fsize: 820000,
    }),
  ]);
  O("SSD-1058", "maya", ago(0, 5), "review", [item("circle", "circle", 3, 1000, "gloss", "fuel", { file: "boise-brew-logo.eps" })]);
  O("SSD-1059", "luis", ago(0, 1.2), "received", [item("reflective", "diecut", 4, 500, "reflective", "star", { file: "tvt-badge.ai" })]);
  O("SSD-1060", "jake", ago(0, 0.4), "received", [
    item("holographic", "diecut", 4, 50, "holo", "flame", {
      designHelp: true,
      designNotes: "Flame with my truck name OLD RED under it. Old-school hot rod vibe.",
      file: "truck-photo.png",
      fsize: 2400000,
    }),
  ]);

  // Special proof histories
  o57.proofs = [
    {
      version: 1,
      art: "fuel-v1",
      sentAt: ago(2, 2),
      status: "changes_requested",
      note: "Love the steam! Can the cup be red instead of dark grey, and make FUEL bigger?",
      respondedAt: ago(1, 20),
      staffMessage: "First pass from your sketch. Let us know what you think.",
    },
    { version: 2, art: "fuel", sentAt: ago(0, 3), status: "pending", note: null, respondedAt: null, staffMessage: "Made the cup Sticker Status red and bumped FUEL up. Ready when you are." },
  ];
  o57.events = o57.events.filter((e) => e.status !== "proof_ready");
  o57.events.push(
    { at: ago(2, 2), status: "proof_ready", text: "Proof v1 sent to customer", actorName: "Staff" },
    { at: ago(1, 20), status: "changes_requested", text: "Customer requested changes on v1", actorName: "Customer" },
    { at: ago(0, 3), status: "proof_ready", text: "Proof v2 sent to customer", actorName: "Staff" },
  );
  o57.events.sort((a, b) => a.at.getTime() - b.at.getTime());

  o53.proofs = [
    {
      version: 1,
      art: "flame",
      sentAt: ago(2, 1),
      status: "changes_requested",
      note: 'Please add "EST. 1998" under the flame and make the red a little darker.',
      respondedAt: ago(0, 6),
      staffMessage: "Proof v1 for Owyhee Moto Club.",
    },
  ];
  o53.events.push({ at: ago(0, 6), status: "changes_requested", text: "Customer requested changes on v1", actorName: "Customer" });
  o53.notes.push({ at: ago(0, 5), authorName: "Kris (Design)", text: "Darker red = our #B00A1F. Adding EST. 1998 plate under the flame." });

  // Due dates chosen to show every state on the production board (due today, overdue, tomorrow)
  o50.dueAt = now;
  o49.dueAt = now;
  o47.dueAt = ago(1);
  o52.dueAt = fut(1);
  o54.dueAt = fut(1);
  o49.notes.push({ at: ago(0, 2), authorName: "Marcus (Print)", text: "Roll 2 had a slight color shift. Pulled 40 pcs, reprinted." });

  const notifications: SeedNotification[] = [
    { customerKey: "jordan", orderNumber: "SSD-1057", kind: "proof_ready", title: "Your proof is ready!", body: "Proof v2 for SSD-1057 is waiting for your approval.", at: ago(0, 3), read: false },
    { customerKey: "jordan", orderNumber: "SSD-1046", kind: "shipped", title: "Your stickers shipped", body: "SSD-1046 is on the way with USPS.", at: ago(1), read: true },
    { customerKey: "jordan", orderNumber: "SSD-1052", kind: "production", title: "In production", body: "SSD-1052 is on the press.", at: ago(2), read: true },
  ];

  return { customers, orders, notifications };
}
