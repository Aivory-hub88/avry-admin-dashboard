import { describe, expect, it } from "vitest";
import { affiliateKey, affiliatePrefix } from "./promoAffiliate";

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

// Same cases as avry-payments tests/test_promo.py::test_affiliate_key_*.
describe("affiliateKey", () => {
  it.each([
    ["PT Distributor Nusantara", "distributor nusantara"],
    ["PT Distributor Nusantara", "Distributor  Nusantara Tbk"],
    ["CV Maju-Jaya", "maju jaya"],
  ])("%s ≡ %s", (a, b) => {
    expect(affiliateKey(a)).toBe(affiliateKey(b));
  });

  it("keeps different affiliates apart", () => {
    expect(affiliateKey("PT Distributor Nusantara")).not.toBe(affiliateKey("PT Distributor Jaya"));
  });
});
