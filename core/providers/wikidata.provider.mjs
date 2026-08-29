import { defineProvider } from "../provider-protocol.mjs";

export class WikidataProvider {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
  }

  async lookup(barcode) {
    const query = `
SELECT ?item ?itemLabel ?itemDescription ?image ?brandLabel ?categoryLabel WHERE {
  { ?item wdt:P3962 "${barcode}". } UNION { ?item wdt:P212 "${barcode}". }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P176 ?brand. }
  OPTIONAL { ?item wdt:P31 ?category. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1`;
    const params = new URLSearchParams({ query, format: "json" });
    const url = `https://query.wikidata.org/sparql?${params}`;
    const response = await this.fetch(url, {
      headers: { accept: "application/sparql-results+json", "user-agent": "barcode-metascan/0.1" },
    });
    if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}.`);

    const result = (await response.json()).results?.bindings?.[0];
    if (!result) throw new Error(`Wikidata has no exact match for ${barcode}.`);

    const resolvedAt = this.now().toISOString();
    return {
      schemaVersion: "1.0",
      barcode,
      barcodeFormat: "EAN_13",
      ...(result.itemLabel?.value && { title: result.itemLabel.value }),
      ...(result.brandLabel?.value && { brand: result.brandLabel.value }),
      ...(result.itemDescription?.value && { description: result.itemDescription.value }),
      ...(result.categoryLabel?.value && { category: result.categoryLabel.value }),
      imageUrls: result.image?.value ? [result.image.value] : [],
      sources: [{ name: "Wikidata", url: result.item.value, retrievedAt: resolvedAt }],
      resolvedAt,
    };
  }
}

export const provider = defineProvider({
  id: "wikidata",
  name: "Wikidata",
  create: (options) => new WikidataProvider(options),
});