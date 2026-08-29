import type { BarcodeFormat, LookupResponse, ProductMetadata, ProviderResult } from "./types";

const configuredApi = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") as string | undefined;

function formatOf(barcode: string): BarcodeFormat {
  if (/^\d{9}[\dX]$/.test(barcode)) return "ISBN_10";
  if (barcode.length === 12) return "UPC_A";
  if (barcode.startsWith("978") || barcode.startsWith("979")) return "ISBN_13";
  return "EAN_13";
}

async function directLookup(barcode: string): Promise<LookupResponse> {
  const format = formatOf(barcode);
  const isBook = format.startsWith("ISBN");
  const now = new Date().toISOString();
  const providers: ProviderResult[] = [];

  if (isBook) {
    const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(barcode)}&maxResults=10`;
    try {
      const google = await fetch(googleUrl).then((response) => response.json());
      const volume = google.items?.find((item: { volumeInfo?: { industryIdentifiers?: Array<{ identifier: string }> } }) =>
        item.volumeInfo?.industryIdentifiers?.some(({ identifier }) => identifier.replace(/[\s-]/g, "") === barcode),
      )?.volumeInfo;
      providers.push(volume ? {
        provider: "Google Books",
        state: "found",
        sourceUrl: googleUrl,
        product: {
          title: [volume.title, volume.subtitle].filter(Boolean).join(": "),
          brand: volume.publisher || volume.authors?.join(", "),
          description: volume.description,
          imageUrls: volume.imageLinks?.thumbnail ? [volume.imageLinks.thumbnail.replace("http://", "https://")] : undefined,
        },
      } : { provider: "Google Books", state: "not_found", sourceUrl: googleUrl });
    } catch {
      providers.push({ provider: "Google Books", state: "unavailable", message: "Request failed" });
    }

    const key = `ISBN:${barcode}`;
    const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&jscmd=data&format=json`;
    try {
      const book = (await fetch(openLibraryUrl).then((response) => response.json()))[key];
      providers.push(book ? {
        provider: "Open Library",
        state: "found",
        sourceUrl: book.url || openLibraryUrl,
        product: {
          title: [book.title, book.subtitle].filter(Boolean).join(": "),
          brand: book.publishers?.[0]?.name || book.authors?.map(({ name }: { name: string }) => name).join(", "),
          imageUrls: book.cover?.large ? [book.cover.large] : undefined,
        },
      } : { provider: "Open Library", state: "not_found", sourceUrl: openLibraryUrl });
    } catch {
      providers.push({ provider: "Open Library", state: "unavailable", message: "Request failed" });
    }
  }

  const offApiUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
  try {
    const payload = await fetch(offApiUrl).then((response) => response.json());
    const item = payload.status === 1 ? payload.product : undefined;
    providers.push(item ? {
      provider: "Open Food Facts",
      state: "found",
      sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
      product: {
        title: item.product_name_en || item.product_name,
        brand: item.brands,
        description: [item.generic_name, item.categories, item.quantity].filter(Boolean).join(" · "),
        imageUrls: item.image_front_url ? [item.image_front_url] : undefined,
      },
    } : { provider: "Open Food Facts", state: "not_found", sourceUrl: offApiUrl });
  } catch {
    providers.push({ provider: "Open Food Facts", state: "unavailable", message: "Request failed" });
  }

  providers.unshift(
    { provider: "Barcode Lookup", state: "not_configured", message: "Use local API with a key" },
    { provider: "EAN-Search", state: "not_configured", message: "Use local API with a token" },
  );
  const found = providers.filter((provider) => provider.state === "found" && provider.product);
  const pick = (field: "title" | "brand" | "description") => found.map(({ product }) => product?.[field]).find(Boolean) as string | undefined;
  const images = [...new Set(found.flatMap(({ product }) => product?.imageUrls || []))];
  const product: ProductMetadata = {
    schemaVersion: "1.0",
    barcode,
    barcodeFormat: format,
    title: pick("title"),
    brand: pick("brand"),
    description: pick("description"),
    imageUrls: images.length ? images : undefined,
    sources: found.map(({ provider, sourceUrl }) => ({ name: provider, url: sourceUrl || "", retrievedAt: now })),
    resolvedAt: now,
  };
  return { product, cached: false, providers };
}

export async function lookup(rawBarcode: string): Promise<{ data: LookupResponse; mode: "api" | "direct" }> {
  const barcode = rawBarcode.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^\d{12,13}$|^\d{9}[\dX]$/.test(barcode)) {
    throw new Error("Enter a 12/13 digit EAN/UPC or a valid-length ISBN");
  }
  try {
    const response = await fetch(`${configuredApi || ""}/api/lookup/${encodeURIComponent(barcode)}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Lookup failed");
    }
    return { data: await response.json(), mode: "api" };
  } catch (error) {
    if (configuredApi) throw error;
    return { data: await directLookup(barcode), mode: "direct" };
  }
}
