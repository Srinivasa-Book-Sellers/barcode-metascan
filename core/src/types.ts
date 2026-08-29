export type BarcodeFormat = "EAN_13" | "UPC_A" | "ISBN_10" | "ISBN_13";

export interface MetadataSource {
  name: string;
  url: string;
  retrievedAt: string;
}

export interface ProductMetadata {
  schemaVersion: "1.0";
  barcode: string;
  barcodeFormat: BarcodeFormat;
  title?: string;
  brand?: string;
  description?: string;
  imageUrls?: string[];
  sources: MetadataSource[];
  resolvedAt: string;
}

export type ProviderState = "found" | "not_found" | "unavailable" | "not_configured" | "skipped";

export interface ProviderResult {
  provider: string;
  state: ProviderState;
  product?: Partial<ProductMetadata>;
  sourceUrl?: string;
  message?: string;
}

export interface LookupResponse {
  product: ProductMetadata;
  cached: boolean;
  providers: ProviderResult[];
}
