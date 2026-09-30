import { describe, expect, it } from "vitest";
import { InvoiceType } from "../types";
import { sanitizeData } from "./geminiService";

describe("sanitizeData", () => {
  it("normalizes a valid triplet invoice", () => {
    expect(sanitizeData({
      date: "2026-09-30",
      invoiceNumber: "ab-12345678",
      amount: "1,000",
      tax: "50",
      total: "1,050",
      remarks: "測試有限公司",
    }, InvoiceType.TRIPLET)).toMatchObject({
      date: "115.09.30",
      invoiceNumber: "AB12345678",
      amount: "1000",
      tax: "50",
      total: "1050",
      remarks: "測試有限公司",
    });
  });

  it("clears invalid invoice numbers", () => {
    const result = sanitizeData({ invoiceNumber: "A123" }, InvoiceType.DUPLICATE);
    expect(result.invoiceNumber).toBe("");
  });

  it("calculates amount and tax when only total is present", () => {
    const result = sanitizeData({ total: "105" }, InvoiceType.TRIPLET);
    expect(result.amount).toBe("100");
    expect(result.tax).toBe("5");
  });
});
