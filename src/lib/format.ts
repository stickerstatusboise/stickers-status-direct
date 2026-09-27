export const money = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money0 = (cents: number) => "$" + Math.round(cents / 100).toLocaleString("en-US");

export const fmtQty = (n: number) => Number(n).toLocaleString("en-US");

export const fmtSize = (bytes: number) =>
  bytes > 1e6 ? (bytes / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1e3)) + " KB";

export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

// Dates are shown in the shop's time zone so the server and browser render the same text.
const TZ = "America/Boise";
const fmt = (opts: Intl.DateTimeFormatOptions) => (d: Date | string) => new Date(d).toLocaleString("en-US", { timeZone: TZ, ...opts });
export const fmtDate = fmt({ month: "short", day: "numeric", year: "numeric" });
export const fmtShort = fmt({ month: "short", day: "numeric" });
export const fmtDT = fmt({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const fmtDTfull = fmt({ month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

/** Carrier tracking page for a tracking number. */
export function trackUrl(carrier: string, number: string) {
  const n = encodeURIComponent(number);
  if (carrier === "UPS") return `https://www.ups.com/track?tracknum=${n}`;
  if (carrier === "FedEx") return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
}
