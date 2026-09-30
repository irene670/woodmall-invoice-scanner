import { InvoiceData, InvoiceType } from "../types";

const CLIENT_ID_KEY = "invoice-scanner-client-id";

function getClientId(): string {
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const clientId = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

export const parseInvoiceImage = async (base64Image: string, type: InvoiceType): Promise<InvoiceData> => {
  const response = await fetch("/api/parse-invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": getClientId(),
    },
    body: JSON.stringify({ base64Image, type }),
  });

  const payload = await response.json().catch(() => null) as
    | { data?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "發票辨識服務暫時無法使用。");
  }

  return sanitizeData(payload?.data ?? {}, type);
};

export const sanitizeData = (data: unknown, type: InvoiceType): InvoiceData => {
  const record = typeof data === "object" && data !== null
    ? data as Record<string, unknown>
    : {};

  const cleanNumber = (val: unknown) => {
    if (!val) return "";
    const str = val.toString().replace(/[^\d]/g, '');
    return str === "" ? "" : str;
  };

  const cleanString = (val: unknown) => {
      if (!val || typeof val !== 'string') return "";
      if (val.toLowerCase() === "null" || val.toLowerCase() === "undefined") return "";
      return val.trim();
  }

  // 1. Basic Cleaning
  let rawDate = (cleanString(record.date)).replace(/-/g, '.');
  let rawInvoiceNumber = cleanString(record.invoiceNumber).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const rawAmount = cleanNumber(record.amount);
  const rawTax = cleanNumber(record.tax);
  const rawTotal = cleanNumber(record.total);
  const rawRemarks = cleanString(record.remarks);

  // 2. Strict Validation: Invoice Number MUST be 10 characters (2 Letters + 8 Digits)
  // Only applies to non-receipt types
  if (type !== InvoiceType.RECEIPT) {
    const invoiceRegex = /^[A-Z]{2}\d{8}$/;
    if (!invoiceRegex.test(rawInvoiceNumber)) {
       // If almost correct (e.g. 11 chars or 9 chars), clear it. 
       // We only accept PERFECTION to avoid hallucinations.
       console.warn(`Validation Failed: Invoice number '${rawInvoiceNumber}' is not 10 chars (2 letters+8 digits). Clearing.`);
       rawInvoiceNumber = ""; 
    }
  }

  // 3. Basic Date Validation
  if (rawDate.length > 0) {
      const parts = rawDate.split('.');
      if (parts.length > 0) {
          const year = parseInt(parts[0]);
          if (!isNaN(year)) {
             // Basic ROC check
             if (year > 1911) rawDate = (year - 1911) + (parts[1] ? '.' + parts[1] : '') + (parts[2] ? '.' + parts[2] : '');
             else if (year < 100 || year > 150) rawDate = ""; 
          }
      }
  }

  const safeData: InvoiceData = {
    type: type,
    date: rawDate,
    invoiceNumber: rawInvoiceNumber,
    amount: rawAmount,
    tax: rawTax,
    total: rawTotal,
    remarks: rawRemarks,
  };

  // 4. Triplet Calculation Logic (Only if Total exists and looks valid)
  if (type === InvoiceType.TRIPLET) {
    const t = parseInt(safeData.total, 10);
    if (!isNaN(t) && t > 0) {
      if (safeData.amount === "" && safeData.tax === "") {
        const calcAmount = Math.round(t / 1.05);
        const calcTax = t - calcAmount;
        safeData.amount = calcAmount.toString();
        safeData.tax = calcTax.toString();
      }
    }
  }

  return safeData;
};
