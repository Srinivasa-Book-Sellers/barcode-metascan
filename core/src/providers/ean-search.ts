import type { ParsedBarcode } from "../barcode.js";
import type { ProviderResult } from "../types.js";
import { cleanImageUrl, text, type Provider } from "./provider.js";

interface EanSearchProduct {
  name?: string;
  descr?: string;
  categoryName?: string;
  issuingCountry?: string;
  image?: string;
}

export class EanSearchProvider implements Provider {
  readonly name = "EAN-Search";

  constructor(private readonly token?: string) {}

  async lookup(barcode: ParsedBarcode, signal: AbortSignal): Promise<ProviderResult> {
    if (!this.token) return { provider: this.name, state: "not_configured", message: "Set EAN_SEARCH_TOKEN" };
    const parameters = new URLSearchParams({ token: this.token, op: "barcode-lookup", format: "json", ean: barcode.value });
    const apiUrl = `https://api.ean-search.org/api?${parameters}`;
    const response = await fetch(apiUrl, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as EanSearchProduct[] | EanSearchProduct;
    const product = Array.isArray(payload) ? payload[0] : payload;
    if (!product || !text(product.name ?? product.descr)) return { provider: this.name, state: "not_found" };
    const image = cleanImageUrl(product.image);
    return {
      provider: this.name,
      state: "found",
      sourceUrl: `https://www.ean-search.org/?q=${barcode.value}`,
      product: {
        title: text(product.name) ?? text(product.descr),
        description: [text(product.descr), text(product.categoryName), text(product.issuingCountry)].filter(Boolean).join(" · ") || undefined,
        imageUrls: image ? [image] : undefined,
      },
    };
  }
}
