"use client";

import { useActionState } from "react";
import { sendLoginCode, verifyLoginCode, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [emailState, sendAction, sending] = useActionState(sendLoginCode, { step: "email", email: "", next } as LoginState);
  const [codeState, verifyAction, verifying] = useActionState(verifyLoginCode, { step: "code", email: "", next } as LoginState);
  const onCodeStep = emailState.step === "code";

  if (!onCodeStep)
    return (
      <form className="card" action={sendAction} style={{ maxWidth: 520 }}>
        <h2>Sign in</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          No password needed. We&apos;ll email you a link and a 6-digit code. New here? This creates your account.
        </p>
        <input type="hidden" name="next" value={next} />
        <div className="stack">
          <div className="field">
            <label htmlFor="si-email">Email</label>
            <input id="si-email" name="email" type="email" required autoComplete="email" defaultValue={emailState.email} autoFocus />
          </div>
          {emailState.error ? (
            <div className="form-err" role="alert">
              {emailState.error}
            </div>
          ) : null}
          <button className="btn btn-red btn-lg" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Email me a sign-in link"}
          </button>
        </div>
      </form>
    );

  // Key on the email so the code form resets if the customer goes back and uses another address
  const state = codeState.email === emailState.email ? codeState : emailState;
  return (
    <form key={emailState.email} className="card" action={verifyAction} style={{ maxWidth: 520 }}>
      <h2>Check your email</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        {emailState.info} Click the <b>Sign in</b> link in it. Open the email on this device and browser so the link can sign you in here.
      </p>
      <input type="hidden" name="email" value={emailState.email} />
      <input type="hidden" name="next" value={next} />
      <div className="stack">
        <div className="field">
          <label htmlFor="si-code">Or, if your email shows a 6-digit code, enter it here</label>
          <input id="si-code" className="code-input" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required autoFocus />
        </div>
        {state.error ? (
          <div className="form-err" role="alert">
            {state.error}
          </div>
        ) : null}
        <button className="btn btn-red btn-lg" type="submit" disabled={verifying}>
          {verifying ? "Checking…" : "Sign in"}
        </button>
        <p className="small muted">
          Didn&apos;t get it? Check spam, or{" "}
          <a className="link" href={`/login?next=${encodeURIComponent(next)}`}>
            use a different email
          </a>
          .
        </p>
      </div>
    </form>
  );
}
