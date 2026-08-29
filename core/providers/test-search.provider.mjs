import { defineProvider } from "../provider-protocol.mjs";

export class TestSearchProvider {
  constructor({ now = () => new Date() } = {}) {
    this.now = now;
  }

  async lookup(barcode) {
    const resolvedAt = this.now().toISOString();

    return {
      schemaVersion: "1.0",
      barcode,
      barcodeFormat: "EAN_13",
      title: "Test Sample Product",
      brand: "Test Brand",
      description: "Test description for a sample product.",
      category: "Test Category",
      imageUrls: ["https://placehold.co/600x600?text=Test+Sample+Product"],
      sources: [{
        name: "Test Search",
        url: "local://test-search",
        retrievedAt: resolvedAt,
      }],
      resolvedAt,
    };
  }
}

export const provider = defineProvider({
  id: "test-search",
  name: "Test Search",
  create: (options) => new TestSearchProvider(options),
});