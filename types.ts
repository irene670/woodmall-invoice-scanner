export enum InvoiceType {
  TRIPLET = 'TRIPLET', // 三聯式、電子發票 (Date, Inv#, Amount, Tax, Total, Remarks)
  DUPLICATE = 'DUPLICATE', // 二聯式 (Date, Inv#, Amount, Remarks)
  RECEIPT = 'RECEIPT', // 收據、郵資券 (Date, Item, Amount)
}

export interface InvoiceData {
  type: InvoiceType;
  date: string;       // 114.12.27
  invoiceNumber: string; // UK18418944 (Empty for Receipt)
  amount: string;     // Sales Amount (Pre-tax) or Total for Receipt/Duplicate depending on column mapping
  tax: string;        // Tax Amount (Only for Triplet)
  total: string;      // Total Amount (Used for Triplet checksum, or main amount for others)
  remarks: string;    // Company Name (from Stamp) or Item Name
  originalImage?: string; // Base64 string of the source image for verification
}

export enum AppState {
  IDLE = 'IDLE',
  CAMERA = 'CAMERA',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  BATCH_PROCESSING = 'BATCH_PROCESSING', // New state for batch handling
}