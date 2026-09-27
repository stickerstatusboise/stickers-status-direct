import { describe, expect, it } from "vitest";
import { detectFileType, imageSize, precheck, safeFileName, typeMatchesExt, UPLOAD_LIMITS } from "./uploads";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...new TextEncoder().encode(p)] : p)));

function png(w: number, h: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const v = new DataView(b.buffer);
  v.setUint32(16, w);
  v.setUint32(20, h);
  return b;
}
function jpg(w: number, h: number) {
  // SOI, an APP0 segment, then SOF0 with the size
  return bytes([0xff, 0xd8], [0xff, 0xe0, 0x00, 0x10], "JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0], [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3]);
}

describe("detectFileType", () => {
  it("recognizes every allowed format by its first bytes", () => {
    expect(detectFileType(png(10, 10))).toBe("png");
    expect(detectFileType(jpg(10, 10))).toBe("jpg");
    expect(detectFileType(bytes("%PDF-1.7\n"))).toBe("pdf");
    expect(detectFileType(bytes("%!PS-Adobe-3.0 EPSF-3.0"))).toBe("postscript");
    expect(detectFileType(bytes([0xc5, 0xd0, 0xd3, 0xc6, 0, 0]))).toBe("postscript");
    expect(detectFileType(bytes("8BPS", [0, 1]))).toBe("psd");
    expect(detectFileType(bytes('﻿<?xml version="1.0"?>\n<!-- logo -->\n<svg xmlns="http://www.w3.org/2000/svg">'))).toBe("svg");
  });
  it("rejects anything else", () => {
    expect(detectFileType(bytes("MZ\x90\x00"))).toBeNull(); // a Windows program
    expect(detectFileType(bytes("<html><body>hi"))).toBeNull();
    expect(detectFileType(new Uint8Array())).toBeNull();
  });
});

describe("typeMatchesExt", () => {
  it("accepts real files, including PDF- and PostScript-based .ai", () => {
    expect(typeMatchesExt("ai", "pdf")).toBe(true);
    expect(typeMatchesExt("ai", "postscript")).toBe(true);
    expect(typeMatchesExt("jpeg", "jpg")).toBe(true);
  });
  it("refuses renamed files", () => {
    expect(typeMatchesExt("png", "jpg")).toBe(false);
    expect(typeMatchesExt("pdf", null)).toBe(false);
    expect(typeMatchesExt("exe", "pdf")).toBe(false);
  });
});

describe("imageSize", () => {
  it("reads PNG and JPEG sizes", () => {
    expect(imageSize(png(1200, 800))).toEqual({ width: 1200, height: 800 });
    expect(imageSize(jpg(3024, 4032))).toEqual({ width: 3024, height: 4032 });
    expect(imageSize(bytes("%PDF-1.4"))).toBeNull();
  });
});

describe("precheck and names", () => {
  it("checks type and size before uploading", () => {
    expect(precheck("logo.PNG", 1000)).toBeNull();
    expect(precheck("logo.exe", 1000)).toMatch(/isn't supported/);
    expect(precheck("big.psd", UPLOAD_LIMITS.maxBytes + 1)).toMatch(/over 50 MB/);
    expect(precheck("empty.png", 0)).toMatch(/empty/);
  });
  it("makes storage-safe names", () => {
    expect(safeFileName("My Logo (final) v2.AI")).toBe("My-Logo-final-v2.ai");
    expect(safeFileName("../../etc/passwd.png")).toBe("etc-passwd.png");
    expect(safeFileName("😀.svg")).toBe("artwork.svg");
  });
});
