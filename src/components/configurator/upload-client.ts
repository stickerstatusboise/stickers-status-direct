"use client";

/**
 * Browser side of artwork uploads: ask our server for a one-time link, send the file straight to private storage
 * (with progress), then ask our server to check it. See src/server/uploads.ts.
 */

export type UploadResult =
  | { ok: true; fileId: string; token: string; width: number | null; height: number | null }
  | { ok: false; local: true }
  /** retryable: a connection problem (try again); otherwise the file itself was refused. */
  | { ok: false; local?: false; error: string; retryable: boolean };

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { res, data: data as Record<string, unknown> };
}

function put(url: string, file: File, onProgress: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (key) {
      xhr.setRequestHeader("apikey", key);
      xhr.setRequestHeader("authorization", `Bearer ${key}`);
    }
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

export async function uploadArtwork(file: File, kind: "artwork" | "reference", onProgress: (pct: number) => void): Promise<UploadResult> {
  try {
    const start = await postJson("/api/uploads", { name: file.name, size: file.size, kind });
    if (start.res.status === 503) return { ok: false, local: true };
    if (!start.res.ok) return { ok: false, error: String(start.data.error ?? "Upload failed."), retryable: start.res.status >= 500 };
    const { fileId, token, uploadUrl } = start.data as { fileId: string; token: string; uploadUrl: string };

    if (!(await put(uploadUrl, file, onProgress))) return { ok: false, error: "Upload interrupted. Check your connection and retry.", retryable: true };

    const done = await postJson("/api/uploads/complete", { fileId, token });
    if (!done.res.ok) return { ok: false, error: String(done.data.error ?? "We couldn't check the file."), retryable: done.res.status >= 500 };
    return { ok: true, fileId, token, width: (done.data.width as number | null) ?? null, height: (done.data.height as number | null) ?? null };
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and retry.", retryable: true };
  }
}
