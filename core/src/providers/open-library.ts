import type { ParsedBarcode } from "../barcode.js";
import type { ProviderResult } from "../types.js";
import { text, type Provider } from "./provider.js";

interface OpenLibraryBook {
  title?: string;
  subtitle?: string;
  publishers?: Array<{ name?: string }>;
  authors?: Array<{ name?: string }>;
  cover?: { large?: string; medium?: string; small?: string };
  url?: string;
  notes?: string;
}

export class OpenLibraryProvider implements Provider {
  readonly name = "Open Library";
  readonly requiresBook = true;

  async lookup(barcode: ParsedBarcode, signal: AbortSignal): Promise<ProviderResult> {
    const key = `ISBN:${barcode.value}`;
    const apiUrl = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&jscmd=data&format=json`;
    const response = await fetch(apiUrl, { signal, headers: { "User-Agent": "barcode-metascan/0.1" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as Record<string, OpenLibraryBook>;
    const book = payload[key];
    if (!book) return { provider: this.name, state: "not_found", sourceUrl: apiUrl };
    const title = [text(book.title), text(book.subtitle)].filter(Boolean).join(": ");
    const image = book.cover?.large ?? book.cover?.medium ?? book.cover?.small;
    return {
      provider: this.name,
      state: "found",
      sourceUrl: book.url ?? apiUrl,
      product: {
        title: title || undefined,
        brand: text(book.publishers?.[0]?.name) ?? text(book.authors?.map(({ name }) => name).filter(Boolean).join(", ")),
        description: text(book.notes),
        imageUrls: image ? [image] : undefined,
      },
    };
  }
}
