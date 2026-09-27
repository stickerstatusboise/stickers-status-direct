/** The shop's time zone. Due dates are 5pm shop time on a business day. */
export const SHOP_TZ = "America/Boise";
export const DUE_HOUR = 17;
/** Business days from proof approval to the print due date. */
export const TURNAROUND_DAYS = { standard: 3, rush: 1 };

/** Calendar date (y, m, d) of an instant in a time zone. */
function zonedDate(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Offset of a time zone from UTC at an instant, in ms (e.g. -6h for Boise in summer). */
function tzOffsetMs(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant that is `hour`:00 local time on y-m-d in the time zone. */
export function zonedTime(y: number, m: number, d: number, hour: number, tz = SHOP_TZ): Date {
  const guess = Date.UTC(y, m - 1, d, hour);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  t = guess - tzOffsetMs(new Date(t), tz); // second pass handles DST edges
  return new Date(t);
}

/** 5pm shop time, `n` business days (Mon–Fri) after the shop-local date of `from`. */
export function addBusinessDays(from: Date, n: number, tz = SHOP_TZ): Date {
  const { y, m, d } = zonedDate(from, tz);
  const cur = new Date(Date.UTC(y, m - 1, d));
  let added = 0;
  while (added < n) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const wd = cur.getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return zonedTime(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate(), DUE_HOUR, tz);
}

/** Print due date after proof approval: 3 business days, or 1 for rush. */
export const dueDateAfterApproval = (approvedAt: Date, rush: boolean) =>
  addBusinessDays(approvedAt, rush ? TURNAROUND_DAYS.rush : TURNAROUND_DAYS.standard);
