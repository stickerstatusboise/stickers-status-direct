"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { approveProofAction, requestChangesAction } from "@/app/(shop)/account/actions";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

/** Approve / Request changes buttons under a pending proof. */
export function ProofActions({ number, disabledReason }: { number: string; disabledReason?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"idle" | "approve" | "changes">("idle");
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "approve") return;
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMode("idle");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  if (disabledReason) return <div className="note">{disabledReason}</div>;

  const approve = () =>
    start(async () => {
      const r = await approveProofAction(number, checked);
      if (!r.ok) return setErr(r.error ?? "");
      setMode("idle");
      toast("Proof approved", `${number} is now in production.`, "ok");
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  const sendChanges = () =>
    start(async () => {
      const r = await requestChangesAction(number, note);
      if (!r.ok) return setErr(r.error ?? "");
      setMode("idle");
      toast("Sent to our team", "You'll get a notification when the revised proof is ready.", "ok");
      router.refresh();
    });

  if (mode === "changes")
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          sendChanges();
        }}
      >
        <div className="field">
          <label htmlFor="chg">What should we change?</label>
          <textarea
            id="chg"
            autoFocus
            required
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Example: Make the text bigger and change the red to a darker shade."
          />
        </div>
        {err ? (
          <div className="form-err" role="alert">
            {err}
          </div>
        ) : null}
        <div className="row">
          <button className="btn btn-ink" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send to our team"}
          </button>
          <button className="btn btn-line" type="button" onClick={() => setMode("idle")}>
            Cancel
          </button>
        </div>
      </form>
    );

  return (
    <>
      <div className="proof-acts">
        <button
          className="btn btn-red btn-lg"
          onClick={() => {
            setErr("");
            setChecked(false);
            setMode("approve");
          }}
        >
          <Icon name="check" size={18} /> Approve proof
        </button>
        <button
          className="btn btn-line btn-lg"
          onClick={() => {
            setErr("");
            setMode("changes");
          }}
        >
          <Icon name="pen" size={18} /> Request changes
        </button>
      </div>
      {mode === "approve" ? (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setMode("idle")}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ap-title" ref={dialogRef}>
            <h2 id="ap-title">Approve this proof?</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              Once approved, this proof is locked as your production artwork and your order goes to the print floor.
            </p>
            <label className="chk" style={{ marginBottom: 18 }}>
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> I checked spelling, colors, size and cut line.
            </label>
            {err ? (
              <div className="form-err" role="alert">
                {err}
              </div>
            ) : null}
            <div className="row">
              <button className="btn btn-red" onClick={approve} disabled={pending}>
                <Icon name="check" size={18} /> {pending ? "Approving…" : "Approve & print"}
              </button>
              <button className="btn btn-line" onClick={() => setMode("idle")}>
                Not yet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
