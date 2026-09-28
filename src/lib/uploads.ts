/**
 * Artwork upload rules, shared by the browser (quick checks) and the server (the real checks).
 * The server reads the first bytes of every uploaded file and refuses anything that isn't what its name says.
 */
import { CATALOG } from "./catalog";

export const UPLOAD_LIMITS = {
  /** Supabase's free plan allows up to 50 MB per file. */
  maxBytes: 50 * 1024 * 1024,
  maxFilesPerItem: 10,
  /** How many bytes the server reads to check the file type and image size. */
  headBytes: 256 * 1024,
};

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
export const isAllowedExt = (ext: string) => CATALOG.uploadTypes.includes(ext);

/** What the bytes say the file is. */
export type DetectedType = "png" | "jpg" | "pdf" | "postscript" | "psd" | "svg";

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

export function detectFileType(b: Uint8Array): DetectedType | null {
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(b, ascii("%PDF-"))) return "pdf";
  if (startsWith(b, ascii("%!PS")) || startsWith(b, [0xc5, 0xd0, 0xd3, 0xc6])) return "postscript"; // EPS (plain or DOS binary)
  if (startsWith(b, ascii("8BPS"))) return "psd";
  // SVG is text: look for an <svg tag near the start, after any XML declaration, comments or doctype
  const text = new TextDecoder("utf-8", { fatal: false }).decode(b.subarray(0, 4096)).replace(/^﻿/, "").trimStart();
  if (text.startsWith("<") && /<svg[\s>]/i.test(text)) return "svg";
  return null;
}

/** File types each extension may really be. Modern .ai files are PDFs inside; older ones are PostScript. */
const ACCEPTS: Record<string, DetectedType[]> = {
  png: ["png"],
  jpg: ["jpg"],
  jpeg: ["jpg"],
  pdf: ["pdf"],
  ai: ["pdf", "postscript"],
  eps: ["postscript"],
  psd: ["psd"],
  svg: ["svg"],
};

export const typeMatchesExt = (ext: string, detected: DetectedType | null) => !!detected && (ACCEPTS[ext] ?? []).includes(detected);

export const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  ai: "application/postscript",
  eps: "application/postscript",
  psd: "image/vnd.adobe.photoshop",
  svg: "image/svg+xml",
};

/** Pixel size of a PNG or JPEG from its first bytes, or null if it can't be read. */
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (detectFileType(b) === "png" && b.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (detectFileType(b) === "jpg") {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      // Start-of-frame markers carry the size (C0–CF, except DHT C4, JPG C8, DAC CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      i += 2 + view.getUint16(i + 2);
    }
  }
  return null;
}

/** Quick browser-side check before uploading. The server repeats the real checks. */
export function precheck(name: string, size: number): string | null {
  if (!isAllowedExt(extOf(name))) return "That file type isn't supported. Use AI, EPS, SVG, PDF, PSD, PNG or JPG.";
  if (size <= 0) return "That file is empty.";
  if (size > UPLOAD_LIMITS.maxBytes) return `That file is over ${UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB. Email large files to the shop, or upload a smaller version.`;
  return null;
}

/** Storage-safe version of a file name (keeps the extension). */
export function safeFileName(name: string) {
  const ext = extOf(name);
  const base = name.slice(0, name.length - ext.length - 1).normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80);
  return `${base || "artwork"}.${ext}`;
}
