import { isBookFormat, parseBarcode } from "./barcode.js";
import { MemoryCache } from "./cache.js";
import type { LookupResponse, ProductMetadata, ProviderResult } from "./types.js";
import type { Provider } from "./providers/provider.js";

export class Resolver {
  constructor(
    private readonly providers: Provider[],
    private readonly cache: MemoryCache,
    private readonly timeoutMs = 8_000,
  ) {}

  async lookup(rawBarcode: string): Promise<LookupResponse> {
    const barcode = parseBarcode(rawBarcode);
    const cached = this.cache.get(barcode.value);
    if (cached) return cached;

    const results = await Promise.all(this.providers.map(async (provider): Promise<ProviderResult> => {
      if (provider.requiresBook && !isBookFormat(barcode.format)) {
        return { provider: provider.name, state: "skipped", message: "ISBN source" };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        return await provider.lookup(barcode, controller.signal);
      } catch (error) {
        const message = error instanceof Error
          ? (error.name === "AbortError" ? "Timed out" : error.message)
          : "Unknown provider error";
        return { provider: provider.name, state: "unavailable", message };
      } finally {
        clearTimeout(timeout);
      }
    }));

    const found = results.filter((result) => result.state === "found" && result.product);
    const first = <K extends "title" | "brand" | "description">(field: K): ProductMetadata[K] =>
      found.map(({ product }) => product?.[field]).find((value) => typeof value === "string" && value.length > 0);
    const imageUrls = [...new Set(found.flatMap(({ product }) => product?.imageUrls ?? []))];
    const now = new Date().toISOString();
    const product: ProductMetadata = {
      schemaVersion: "1.0",
      barcode: barcode.value,
      barcodeFormat: barcode.format,
      title: first("title"),
      brand: first("brand"),
      description: first("description"),
      imageUrls: imageUrls.length ? imageUrls : undefined,
      sources: found.map((result) => ({
        name: result.provider,
        url: result.sourceUrl ?? "",
        retrievedAt: now,
      })),
      resolvedAt: now,
    };
    const response = { product, cached: false, providers: results };
    if (found.length) this.cache.set(barcode.value, response);
    return response;
  }
}
