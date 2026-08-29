import assert from "node:assert/strict";
import test from "node:test";
import { TestSearchProvider } from "./providers/test-search.provider.mjs";

test("test search returns sample product details for a barcode", async () => {
  const provider = new TestSearchProvider({
    now: () => new Date("2026-08-29T00:00:00Z"),
  });

  const details = await provider.lookup("4006381333931");

  assert.deepEqual(details, {
    schemaVersion: "1.0",
    barcode: "4006381333931",
    barcodeFormat: "EAN_13",
    title: "Test Sample Product",
    brand: "Test Brand",
    description: "Test description for a sample product.",
    category: "Test Category",
    imageUrls: ["https://placehold.co/600x600?text=Test+Sample+Product"],
    sources: [{
      name: "Test Search",
      url: "local://test-search",
      retrievedAt: "2026-08-29T00:00:00.000Z",
    }],
    resolvedAt: "2026-08-29T00:00:00.000Z",
  });
});