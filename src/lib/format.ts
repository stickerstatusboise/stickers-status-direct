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
