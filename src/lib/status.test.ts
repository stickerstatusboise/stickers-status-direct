import { describe, expect, it } from "vitest";
import { canTransition, CUSTOMER_NOTICE, STAGE_OF, STAGES, STATUS, TRANSITIONS } from "./status";

describe("order status rules", () => {
  it("follows the order lifecycle", () => {
    const happy = ["received", "review", "proof_ready", "approved", "production", "qc", "ready_to_ship", "shipped", "delivered"] as const;
    for (let i = 1; i < happy.length; i++) expect(canTransition(happy[i - 1], happy[i])).toBe(true);
  });
  it("lets proofs go back and forth until approved", () => {
    expect(canTransition("proof_ready", "changes_requested")).toBe(true);
    expect(canTransition("changes_requested", "proof_ready")).toBe(true);
    expect(canTransition("changes_requested", "approved")).toBe(false);
  });
  it("can't skip the proof or go backwards once printed", () => {
    expect(canTransition("received", "production")).toBe(false);
    expect(canTransition("shipped", "production")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });
  it("has labels, a tracker stage and transitions for every status", () => {
    for (const s of Object.keys(STATUS) as (keyof typeof STATUS)[]) {
      expect(TRANSITIONS[s]).toBeDefined();
      expect(STAGE_OF[s]).toBeLessThan(STAGES.length);
    }
  });
  it("notifies customers only about customer-facing changes", () => {
    expect(CUSTOMER_NOTICE.proof_ready?.("SSD-1061").title).toBe("Your proof is ready!");
    expect(CUSTOMER_NOTICE.review).toBeUndefined();
    expect(CUSTOMER_NOTICE.approved).toBeUndefined();
  });
});
