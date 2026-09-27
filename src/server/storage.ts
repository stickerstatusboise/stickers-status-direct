/* Server code only (uses the secret service key). Not marked "server-only" so the deploy script and tests can import it. */
import { createClient } from "@supabase/supabase-js";
import { UPLOAD_LIMITS } from "@/lib/uploads";

/** The two private buckets: customer artwork, and proofs (step 6). */
export const BUCKETS = { artwork: "artwork", proofs: "proofs" } as const;

/** What upload code needs from storage. The real one is Supabase; tests use an in-memory fake. */
export interface Storage {
  createUploadUrl(bucket: string, path: string): Promise<{ signedUrl: string }>;
  readHead(bucket: string, path: string, bytes: number): Promise<Uint8Array | null>;
  remove(bucket: string, paths: string[]): Promise<void>;
  downloadUrl(bucket: string, path: string, fileName: string, seconds?: number): Promise<string>;
}

export const storageConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Server-only Supabase client with the service key: full access, never sent to the browser. */
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("File storage isn't set up: add SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function supabaseStorage(): Storage {
  const s = admin().storage;
  return {
    async createUploadUrl(bucket, path) {
      const { data, error } = await s.from(bucket).createSignedUploadUrl(path);
      if (error || !data) throw new Error(`Couldn't start upload: ${error?.message}`);
      return { signedUrl: data.signedUrl };
    },
    async readHead(bucket, path, bytes) {
      const { data, error } = await s.from(bucket).createSignedUrl(path, 60);
      if (error || !data) return null;
      const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${bytes - 1}` } });
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer()).subarray(0, bytes);
    },
    async remove(bucket, paths) {
      if (paths.length) await s.from(bucket).remove(paths);
    },
    async downloadUrl(bucket, path, fileName, seconds = 300) {
      const { data, error } = await s.from(bucket).createSignedUrl(path, seconds, { download: fileName });
      if (error || !data) throw new Error(`Couldn't create download link: ${error?.message}`);
      return data.signedUrl;
    },
  };
}

/** Create the private buckets if they don't exist yet (run on each production deploy). */
export async function ensureBuckets() {
  const s = admin().storage;
  for (const id of Object.values(BUCKETS)) {
    const { data } = await s.getBucket(id);
    if (!data) {
      const { error } = await s.createBucket(id, { public: false, fileSizeLimit: UPLOAD_LIMITS.maxBytes });
      if (error && !/exists/i.test(error.message)) throw new Error(`Couldn't create bucket ${id}: ${error.message}`);
    }
  }
}
