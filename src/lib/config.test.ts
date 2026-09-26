import { describe, expect, it } from "vitest";
import { dimLabel, dims, newConfig } from "./config";

describe("dims", () => {
  it("derives height from the shape", () => {
    expect(dims({ ...newConfig("rectangle"), size: 4 })).toEqual({ w: 4, h: 2.75 });
    expect(dims({ ...newConfig("oval"), size: 3 })).toEqual({ w: 3, h: 2 });
    expect(dims({ ...newConfig("circle"), size: 5 })).toEqual({ w: 5, h: 5 });
  });
  it("uses custom width and height, squared up for circles", () => {
    expect(dims({ shape: "rect", size: "custom", cw: 7, ch: 3.5 })).toEqual({ w: 7, h: 3.5 });
    expect(dims({ shape: "square", size: "custom", cw: 7, ch: 3.5 })).toEqual({ w: 7, h: 7 });
  });
  it("labels sizes in inches", () => {
    expect(dimLabel({ shape: "rect", size: 3, cw: 0, ch: 0 })).toBe("3″ × 2″");
  });
});
