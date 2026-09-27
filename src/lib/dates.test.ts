import { describe, expect, it } from "vitest";
import { addBusinessDays, dueDateAfterApproval, zonedTime } from "./dates";

describe("zonedTime", () => {
  it("converts Boise local time to UTC across daylight saving", () => {
    expect(zonedTime(2026, 7, 15, 17).toISOString()).toBe("2026-07-15T23:00:00.000Z"); // MDT, UTC-6
    expect(zonedTime(2026, 12, 15, 17).toISOString()).toBe("2026-12-16T00:00:00.000Z"); // MST, UTC-7
  });
});

describe("addBusinessDays", () => {
  it("skips weekends and lands at 5pm Boise time", () => {
    // Thu 2026-10-01 10:00 Boise → 3 business days → Tue 2026-10-06 17:00 MDT
    const thu = zonedTime(2026, 10, 1, 10);
    expect(addBusinessDays(thu, 3).toISOString()).toBe("2026-10-06T23:00:00.000Z");
  });
  it("uses the Boise date, not the UTC date, late in the evening", () => {
    // Fri 2026-10-02 22:00 Boise is already Saturday in UTC; next business day is still Mon 10-05
    const friNight = zonedTime(2026, 10, 2, 22);
    expect(addBusinessDays(friNight, 1).toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });
  it("approval on a weekend counts from Monday", () => {
    const sat = zonedTime(2026, 10, 3, 12);
    expect(addBusinessDays(sat, 1).toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });
});

describe("dueDateAfterApproval", () => {
  it("is 3 business days, or 1 for rush", () => {
    const mon = zonedTime(2026, 10, 5, 9);
    expect(dueDateAfterApproval(mon, false).toISOString()).toBe("2026-10-08T23:00:00.000Z");
    expect(dueDateAfterApproval(mon, true).toISOString()).toBe("2026-10-06T23:00:00.000Z");
  });
});
