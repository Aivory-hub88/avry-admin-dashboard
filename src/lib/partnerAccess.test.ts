import { describe, expect, it } from "vitest";
import { PARTNER_FREE_MONTH_OPTIONS, describePartnerAccess, formatFreeMonths } from "./partnerAccess";

describe("partner free access", () => {
  const now = new Date("2026-10-17T00:00:00Z");

  it("offers exactly the durations the backend accepts", () => {
    expect([...PARTNER_FREE_MONTH_OPTIONS]).toEqual([1, 3, 5]);
  });

  it("labels an active free period with its end date", () => {
    expect(describePartnerAccess("2027-01-17T00:00:00Z", now)).toEqual({
      label: "Free until 17 Jan 2027",
      expired: false,
    });
  });

  it("labels a lapsed free period as expired", () => {
    expect(describePartnerAccess("2026-10-03T00:00:00Z", now)).toEqual({
      label: "Expired 3 Oct 2026",
      expired: true,
    });
  });

  it("returns null when there is no usable date", () => {
    expect(describePartnerAccess(null, now)).toBeNull();
    expect(describePartnerAccess("not a date", now)).toBeNull();
  });

  it("pluralises months", () => {
    expect(formatFreeMonths(1)).toBe("1 month");
    expect(formatFreeMonths(5)).toBe("5 months");
  });
});
