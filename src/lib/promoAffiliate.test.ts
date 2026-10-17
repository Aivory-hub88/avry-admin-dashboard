import { describe, expect, it } from "vitest";
import { affiliatePrefix } from "./promoAffiliate";

// Same cases as avry-payments tests/test_promo.py::test_affiliate_prefix.
describe("affiliatePrefix", () => {
  it.each([
    [null, "PT Distributor Nusantara", "DISTRIBUTORN"],
    ["Budi Santoso", null, "BUDISANTOSO"],
    ["Budi", "CV Maju Jaya", "MAJUJAYA"],
    ["Rina", "  ", "RINA"],
    [null, "PT", "PT"],
    ["x", null, ""],
    [null, null, ""],
  ])("(%s, %s) -> %s", (name, company, expected) => {
    expect(affiliatePrefix(name, company)).toBe(expected);
  });

  it("drops symbols and keeps the code alphabet", () => {
    expect(affiliatePrefix(null, "PT Sinar Mas Agro Resources & Technology Tbk")).toBe("SINARMASAGRO");
  });
});
