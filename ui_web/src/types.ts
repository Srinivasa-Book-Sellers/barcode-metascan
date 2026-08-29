export type BarcodeFormat = "EAN_13" | "UPC_A" | "ISBN_10" | "ISBN_13";

export interface ProductMetadata {
  schemaVersion: "1.0";
  barcode: string;
  barcodeFormat: BarcodeFormat;
  title?: string;
  brand?: string;
  description?: string;
  imageUrls?: string[];
  sources: Array<{ name: string; url: string; retrievedAt: string }>;
  resolvedAt: string;
}

export interface ProviderResult {
  provider: string;
  state: "found" | "not_found" | "unavailable" | "not_configured" | "skipped";
  message?: string;
  sourceUrl?: string;
  product?: Partial<ProductMetadata>;
}

export interface LookupResponse {
  product: ProductMetadata;
  cached: boolean;
  providers: ProviderResult[];
}
