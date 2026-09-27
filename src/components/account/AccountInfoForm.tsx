"use client";

import { useActionState, useEffect } from "react";
import { updateAccountAction, type ActionResult } from "@/app/(shop)/account/actions";
import { useToast } from "@/components/ui/Toast";
import type { Address } from "@/server/db/schema";

export function AccountInfoForm({
  me,
  readOnly,
}: {
  me: { name: string; email: string; phone: string | null; company: string | null; defaultAddress: Address | null };
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [state, action, pending] = useActionState(updateAccountAction, null as ActionResult | null);
  useEffect(() => {
    if (state?.ok) toast("Account saved", "", "ok");
  }, [state, toast]);
  const a = me.defaultAddress;
  const f = (id: string, label: string, name: string, value: string | null | undefined, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} defaultValue={value ?? ""} disabled={readOnly} {...extra} />
    </div>
  );
  return (
    <form className="card" action={action} style={{ maxWidth: 720, marginBottom: 80 }}>
      <h2>Account info</h2>
      <div className="stack">
        <div className="grid2">
          {f("ai-name", "Full name", "name", me.name, { required: true, autoComplete: "name" })}
          {f("ai-co", "Company", "company", me.company, { autoComplete: "organization" })}
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="ai-email">Email</label>
            <input id="ai-email" value={me.email} disabled />
          </div>
          {f("ai-phone", "Phone", "phone", me.phone, { type: "tel", autoComplete: "tel" })}
        </div>
        {f("ai-a1", "Default shipping address", "line1", a?.line1, { autoComplete: "address-line1" })}
        {f("ai-a2", "Apt, suite (optional)", "line2", a?.line2, { autoComplete: "address-line2" })}
        <div className="grid3">
          {f("ai-city", "City", "city", a?.city, { autoComplete: "address-level2" })}
          {f("ai-state", "State", "state", a?.state, { autoComplete: "address-level1" })}
          {f("ai-zip", "ZIP", "zip", a?.zip, { autoComplete: "postal-code", inputMode: "numeric" })}
        </div>
        {state && !state.ok ? (
          <div className="form-err" role="alert">
            {state.error}
          </div>
        ) : null}
        {readOnly ? null : (
          <div className="row">
            <button className="btn btn-ink" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
