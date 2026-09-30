import { InvoiceType } from "../types";

const STRICT_RULES = `
CRITICAL INSTRUCTIONS (MUST FOLLOW):
1. NO HALLUCINATIONS: If text is blurry, cut off, too small, or obscured, return an empty string "".
2. DO NOT GUESS: Do not infer numbers based on context.
3. LEAVE BLANK IF UNSURE: Empty fields are better than incorrect data.
4. COMPANY NAME (Seller): Read the seller from the bottom-right issuer-stamp or seller field. Never use the buyer name.
5. IGNORE EXAMPLES: Examples describe format only.
6. INVOICE NUMBER: Accept only 2 uppercase letters followed by 8 digits.
7. VERIFICATION: Inspect the image twice. Return "" when characters are unclear.
`;

export function buildInvoicePrompt(type: InvoiceType): string {
  const fields = type === InvoiceType.TRIPLET
    ? `Extract a Taiwan triple-duplicate or electronic invoice: date, invoiceNumber, pre-tax amount, tax, total, and seller name in remarks.`
    : type === InvoiceType.DUPLICATE
      ? `Extract a Taiwan duplicate invoice: date, invoiceNumber, total amount into amount, and seller name in remarks. Set tax and total to "".`
      : `Extract a receipt or postal voucher: date, main item name in remarks, and total amount into amount. Set invoiceNumber, tax, and total to "".`;

  return `${fields}

Return raw JSON only. Every value must be a string:
{
  "date": "YYYY.MM.DD or YYY.MM.DD or empty",
  "invoiceNumber": "2 letters and 8 digits or empty",
  "amount": "digits only or empty",
  "tax": "digits only or empty",
  "total": "digits only or empty",
  "remarks": "text or empty"
}

${STRICT_RULES}`;
}
