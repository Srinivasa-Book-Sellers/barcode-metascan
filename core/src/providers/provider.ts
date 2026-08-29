import type { ParsedBarcode } from "../barcode.js";
import type { ProviderResult } from "../types.js";

export interface Provider {
  readonly name: string;
  readonly requiresBook?: boolean;
  lookup(barcode: ParsedBarcode, signal: AbortSignal): Promise<ProviderResult>;
}

export function cleanImageUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  return url.replace(/^http:\/\//, "https://");
}

export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
