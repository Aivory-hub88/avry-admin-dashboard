import { describe, expect, it } from "vitest";
import { accountTypeLabel, planLabel } from "./accountLabels";

describe("account labels — no free plan", () => {
  it("never labels anything Free", () => {
    expect(accountTypeLabel("free")).toBe("Not activated");
    expect(planLabel("free")).toBe("Not activated");
    expect(planLabel(null)).toBe("Not activated");
  });

  it("names plans and account types", () => {
    expect(planLabel("business")).toBe("Business");
    expect(planLabel("pro")).toBe("Business");
    expect(planLabel("blueprint")).toBe("Blueprint");
    expect(accountTypeLabel("paid")).toBe("Customer");
    expect(accountTypeLabel("partner")).toBe("Partner");
  });
});
