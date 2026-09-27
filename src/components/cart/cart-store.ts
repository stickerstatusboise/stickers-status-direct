"use client";

/**
 * Browser cart, saved in localStorage (like the prototype). Nothing is sent to a server until checkout,
 * where the server will reprice every item (step 5).
 */
import { useSyncExternalStore } from "react";
import type { StickerConfig } from "@/lib/config";

export interface ArtFile {
  name: string;
  size: number;
  type: string;
  /** Small image preview (data URL) for PNG/JPG/SVG files; null for other types. */
  url: string | null;
}

export interface CartItem extends StickerConfig {
  uid: string;
  files: ArtFile[];
}

const KEY = "ssd-cart-v1";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full (large previews) or blocked: retry without previews, else keep the cart in memory only.
    try {
      localStorage.setItem(KEY, JSON.stringify(items.map((i) => ({ ...i, files: i.files.map((f) => ({ ...f, url: null })) }))));
    } catch {
      /* in-memory only */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Cart items, or null during server render / before the browser cart has loaded. */
export function useCart(): CartItem[] | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export const cart = {
  upsert(item: CartItem) {
    const items = read();
    const i = items.findIndex((x) => x.uid === item.uid);
    write(i > -1 ? items.map((x, j) => (j === i ? item : x)) : [...items, item]);
  },
  remove(uid: string) {
    write(read().filter((x) => x.uid !== uid));
  },
  clear() {
    write([]);
  },
};

export const newUid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random());
