import { describe, expect, it } from "vitest";
import { clampFit, printQuality } from "./artwork";
import { stickerSvg } from "./sticker-svg";

describe("printQuality", () => {
  it("rates a big logo on a small sticker as sharp", () => {
    // 3in die cut, 1200px wide → 400 px per inch
    expect(printQuality({ width: 1200, height: 1200 }, { w: 3, h: 3 }, "diecut")).toEqual({ level: "good", ppi: 400 });
  });

  it("flags a small image on a big sticker as blurry", () => {
    // 400px on a 6in die cut → 67 px per inch
    expect(printQuality({ width: 400, height: 300 }, { w: 6, h: 6 }, "diecut")).toEqual({ level: "low", ppi: 67 });
  });

  it("accounts for the margin inside round stickers", () => {
    // 4in circle: artwork area is 70% = 2.8in; 600px / 2.8in ≈ 214 → ok
    expect(printQuality({ width: 600, height: 600 }, { w: 4, h: 4 }, "circle")).toEqual({ level: "ok", ppi: 214 });
  });

  it("uses the limiting side for tall images", () => {
    // 3in square, area 2.4in; 500×1000 image is height-limited: printed width 1.2in → 417
    expect(printQuality({ width: 500, height: 1000 }, { w: 3, h: 3 }, "square").ppi).toBe(417);
  });

  it("gets worse when the customer enlarges the artwork", () => {
    const base = printQuality({ width: 800, height: 800 }, { w: 3, h: 3 }, "square");
    const zoomed = printQuality({ width: 800, height: 800 }, { w: 3, h: 3 }, "square", { scale: 2, x: 0, y: 0 });
    expect(base.level).toBe("good");
    expect(zoomed.ppi).toBe(Math.round(base.ppi / 2));
    expect(zoomed.level).toBe("ok");
  });

  it("ignores resizing on die cut", () => {
    expect(printQuality({ width: 900, height: 900 }, { w: 3, h: 3 }, "diecut", { scale: 2, x: 0, y: 0 }).ppi).toBe(300);
  });
});

describe("clampFit", () => {
  it("keeps size and position in range", () => {
    expect(clampFit({ scale: 9, x: -3, y: 0.2 })).toEqual({ scale: 2.5, x: -0.5, y: 0.2 });
    expect(clampFit({ scale: Number.NaN, x: Number.NaN, y: 0 })).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

describe("stickerSvg with a customer fit", () => {
  const imgAttrs = (svg: string) => svg.match(/<image [^>]*>/)?.[0];
  it("resizes and moves the image on shaped stickers", () => {
    const base = stickerSvg({ id: "t", url: "data:image/png;base64,AA", shape: "square", w: 3, h: 3 });
    const moved = stickerSvg({ id: "t", url: "data:image/png;base64,AA", shape: "square", w: 3, h: 3, fit: { scale: 2, x: 0.25, y: 0 } });
    expect(imgAttrs(base)).toContain('width="160.0"');
    expect(imgAttrs(moved)).toContain('width="320.0"');
    expect(imgAttrs(moved)).toContain('x="8.0" y="-42.0"');
  });
  it("leaves die cut artwork untouched", () => {
    const a = stickerSvg({ id: "t", url: "data:x", shape: "diecut", w: 3, h: 3 });
    const b = stickerSvg({ id: "t", url: "data:x", shape: "diecut", w: 3, h: 3, fit: { scale: 2, x: 0.3, y: 0.3 } });
    expect(b).toBe(a);
  });
});
