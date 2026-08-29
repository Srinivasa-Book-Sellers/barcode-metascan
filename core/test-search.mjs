export class TestSearchProvider {
  constructor({ now = () => new Date() } = {}) {
    this.name = "Test Search";
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
        name: this.name,
        url: "local://test-search",
        retrievedAt: resolvedAt,
      }],
      resolvedAt,
    };
  }
}