import { defineProvider } from "../provider-protocol.mjs";

export class OpenLibraryProvider {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
  }

  async lookup(barcode) {
    const params = new URLSearchParams({
      isbn: barcode,
      fields: "key,title,author_name,publisher,isbn,cover_i,subject",
      limit: "10",
    });
    const url = `https://openlibrary.org/search.json?${params}`;
    const response = await this.fetch(url, {
      headers: { accept: "application/json", "user-agent": "barcode-metascan/0.1" },
    });
    if (!response.ok) throw new Error(`Open Library returned HTTP ${response.status}.`);

    const body = await response.json();
    const book = body.docs?.find((candidate) => candidate.isbn?.includes(barcode));
    if (!book) throw new Error(`Open Library has no exact match for ${barcode}.`);

    const resolvedAt = this.now().toISOString();
    const description = Array.isArray(book.author_name)
      ? `By ${book.author_name.join(", ")}`
      : undefined;
    return {
      schemaVersion: "1.0",
      barcode,
      barcodeFormat: "EAN_13",
      ...(book.title && { title: book.title }),
      ...(book.publisher?.[0] && { brand: book.publisher[0] }),
      ...(description && { description }),
      ...(book.subject?.[0] && { category: book.subject[0] }),
      imageUrls: book.cover_i
        ? [`https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`]
        : [],
      sources: [{ name: "Open Library", url, retrievedAt: resolvedAt }],
      resolvedAt,
    };
  }
}

export const provider = defineProvider({
  id: "open-library",
  name: "Open Library",
  create: (options) => new OpenLibraryProvider(options),
});