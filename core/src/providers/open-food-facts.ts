import type { ParsedBarcode } from "../barcode.js";
import type { ProviderResult } from "../types.js";
import { cleanImageUrl, text, type Provider } from "./provider.js";

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  generic_name?: string;
  categories?: string;
  quantity?: string;
  image_front_url?: string;
  image_url?: string;
}

export class OpenFoodFactsProvider implements Provider {
  readonly name = "Open Food Facts";

  async lookup(barcode: ParsedBarcode, signal: AbortSignal): Promise<ProviderResult> {
    const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode.value}.json`;
    const response = await fetch(apiUrl, {
      signal,
      headers: { "User-Agent": "barcode-metascan/0.1 (metadata lookup)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { status?: number; product?: OffProduct };
    if (payload.status !== 1 || !payload.product) return { provider: this.name, state: "not_found", sourceUrl: apiUrl };
    const product = payload.product;
    const details = [text(product.generic_name), text(product.categories), text(product.quantity)].filter(Boolean).join(" · ");
    const image = cleanImageUrl(product.image_front_url ?? product.image_url);
    return {
      provider: this.name,
      state: "found",
      sourceUrl: `https://world.openfoodfacts.org/product/${barcode.value}`,
      product: {
        title: text(product.product_name_en) ?? text(product.product_name),
        brand: text(product.brands),
        description: details || undefined,
        imageUrls: image ? [image] : undefined,
      },
    };
  }
}
