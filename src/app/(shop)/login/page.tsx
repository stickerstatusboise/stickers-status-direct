import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/server/auth/customers";
import { getViewer } from "@/server/auth/session";
import { supabaseEnv } from "@/server/auth/supabase";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getViewer()) redirect(next);
  const failed = sp.error === "link";
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <div className="page-hd">
        <h1>Your account</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          Sign in to approve proofs, track orders and reorder.
        </p>
      </div>
      {failed ? (
        <div className="form-err" role="alert" style={{ maxWidth: 520 }}>
          That sign-in link has expired or was already used. Enter your email to get a new one.
        </div>
      ) : null}
      {supabaseEnv() ? (
        <LoginForm next={next} />
      ) : (
        <div className="card" style={{ maxWidth: 520 }}>
          <h2>Sign-in is almost ready</h2>
          <p className="muted">Accounts switch on once the shop finishes setup. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
