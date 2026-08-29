import { defineProvider } from "../provider-protocol.mjs";

export class UpcitemdbProvider {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
  }

  async lookup(barcode) {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`;
    const response = await this.fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`UPCitemdb returned HTTP ${response.status}.`);

    const body = await response.json();
    const item = body.items?.find((candidate) => (
      [candidate.ean, candidate.upc, candidate.gtin].map(String).includes(barcode)
    ));
    if (!item) throw new Error(`UPCitemdb has no exact match for ${barcode}.`);

    const resolvedAt = this.now().toISOString();
    return {
      schemaVersion: "1.0",
      barcode,
      barcodeFormat: "EAN_13",
      ...(item.title && { title: item.title }),
      ...(item.brand && { brand: item.brand }),
      ...(item.description && { description: item.description }),
      ...(item.category && { category: item.category }),
      imageUrls: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
      sources: [{ name: "UPCitemdb", url, retrievedAt: resolvedAt }],
      resolvedAt,
    };
  }
}

export const provider = defineProvider({
  id: "upcitemdb",
  name: "UPCitemdb Trial",
  create: (options) => new UpcitemdbProvider(options),
});