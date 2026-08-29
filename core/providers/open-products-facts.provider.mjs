import { defineProvider } from "../provider-protocol.mjs";

export class OpenProductsFactsProvider {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
  }

  async lookup(barcode) {
    const url = `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const response = await this.fetch(url, {
      headers: { accept: "application/json", "user-agent": "barcode-metascan/0.1" },
    });
    if (!response.ok) throw new Error(`Open Products Facts returned HTTP ${response.status}.`);

    const body = await response.json();
    const product = body.product;
    if (!product || String(product.code) !== barcode) {
      throw new Error(`Open Products Facts has no exact match for ${barcode}.`);
    }

    const resolvedAt = this.now().toISOString();
    const imageUrls = [product.image_front_url, product.image_url].filter(Boolean);
    return {
      schemaVersion: "1.0",
      barcode,
      barcodeFormat: "EAN_13",
      ...(product.product_name && { title: product.product_name }),
      ...(product.brands && { brand: product.brands }),
      ...(product.generic_name && { description: product.generic_name }),
      ...(product.categories && { category: product.categories }),
      imageUrls: [...new Set(imageUrls)],
      sources: [{ name: "Open Products Facts", url, retrievedAt: resolvedAt }],
      resolvedAt,
    };
  }
}

export const provider = defineProvider({
  id: "open-products-facts",
  name: "Open Products Facts",
  create: (options) => new OpenProductsFactsProvider(options),
});