import type { ParsedBarcode } from "../barcode.js";
import type { ProviderResult } from "../types.js";
import { cleanImageUrl, text, type Provider } from "./provider.js";

interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

export class GoogleBooksProvider implements Provider {
  readonly name = "Google Books";
  readonly requiresBook = true;

  constructor(private readonly apiKey?: string) {}

  async lookup(barcode: ParsedBarcode, signal: AbortSignal): Promise<ProviderResult> {
    const parameters = new URLSearchParams({ q: `isbn:${barcode.value}`, maxResults: "10" });
    if (this.apiKey) parameters.set("key", this.apiKey);
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?${parameters}`;
    const response = await fetch(apiUrl, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { items?: GoogleVolume[] };
    const volume = payload.items?.find(({ volumeInfo }) =>
      volumeInfo?.industryIdentifiers?.some(({ identifier }) => identifier.replace(/[\s-]/g, "") === barcode.value),
    );
    if (!volume?.volumeInfo) return { provider: this.name, state: "not_found", sourceUrl: apiUrl };

    const info = volume.volumeInfo;
    const titleParts = [text(info.title), text(info.subtitle)].filter(Boolean);
    const image = cleanImageUrl(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail);
    return {
      provider: this.name,
      state: "found",
      sourceUrl: apiUrl,
      product: {
        title: titleParts.join(": ") || undefined,
        brand: text(info.publisher) ?? info.authors?.join(", "),
        description: text(info.description),
        imageUrls: image ? [image] : undefined,
      },
    };
  }
}
