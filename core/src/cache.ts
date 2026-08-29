import type { LookupResponse } from "./types.js";

interface CacheEntry {
  expiresAt: number;
  value: LookupResponse;
}

export class MemoryCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs: number) {}

  get(barcode: string): LookupResponse | undefined {
    const entry = this.entries.get(barcode);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(barcode);
      return undefined;
    }
    return { ...entry.value, cached: true };
  }

  set(barcode: string, value: LookupResponse): void {
    this.entries.set(barcode, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
