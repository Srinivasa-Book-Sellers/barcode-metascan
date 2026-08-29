import type { ParsedBarcode } from "../barcode.js";
import type { ProviderResult } from "../types.js";
import { cleanImageUrl, text, type Provider } from "./provider.js";

interface BarcodeLookupProduct {
  title?: string;
  brand?: string;
  description?: string;
  category?: string;
  images?: string[];
}

export class BarcodeLookupProvider implements Provider {
  readonly name = "Barcode Lookup";

  constructor(private readonly apiKey?: string) {}

  async lookup(barcode: ParsedBarcode, signal: AbortSignal): Promise<ProviderResult> {
    if (!this.apiKey) return { provider: this.name, state: "not_configured", message: "Set BARCODE_LOOKUP_API_KEY" };
    const parameters = new URLSearchParams({ barcode: barcode.value, formatted: "y", key: this.apiKey });
    const apiUrl = `https://api.barcodelookup.com/v3/products?${parameters}`;
    const response = await fetch(apiUrl, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { products?: BarcodeLookupProduct[] };
    const product = payload.products?.[0];
    if (!product) return { provider: this.name, state: "not_found" };
    const images = product.images?.map(cleanImageUrl).filter((url): url is string => Boolean(url));
    return {
      provider: this.name,
      state: "found",
      sourceUrl: `https://www.barcodelookup.com/${barcode.value}`,
      product: {
        title: text(product.title),
        brand: text(product.brand),
        description: [text(product.description), text(product.category)].filter(Boolean).join(" · ") || undefined,
        imageUrls: images?.length ? images : undefined,
      },
    };
  }
}
