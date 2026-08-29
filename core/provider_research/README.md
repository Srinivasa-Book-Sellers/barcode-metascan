# Barcode Metadata Provider Research

Test date: 2026-08-29

## Executive conclusion

There is no reliable free and open general-product API for this Indian stationery sample. UPCitemdb was the only general catalogue tested that returned any exact matches, resolving 2 of 10 unique codes. Only one of the eight non-book products was found, and it had no image. Open Products Facts and Open Food Facts resolved none of the sample.

Use a routed, cache-first pipeline rather than one provider:

1. Validate the GS1 check digit locally and preserve the scanned code as a string.
2. For `978` or `979` EAN-13 values, query Google Books first and accept a result only when `volumeInfo.industryIdentifiers` contains the scanned ISBN. Use an API key in production.
3. Query Open Library as a low-volume, terms-compatible book fallback, again requiring an exact ISBN in the response.
4. Query UPCitemdb for general products and unresolved books. Require `ean`, `upc`, or `gtin` to equal the input.
5. For Indian stationery, evaluate GS1 India DataKart under a retailer agreement. It is the strongest candidate for authoritative, brand-supplied `890` data, but it is not an anonymous public API.
6. Return an unresolved record or ask for manual entry when no exact result exists. Cache successful records with source and retrieval time.

The prototype in [barcode_lookup.py](barcode_lookup.py) implements steps 1-4 with only the Python standard library. It does not scrape HTML.

## Method

The supplied list contained one duplicate (`9789361059537`), leaving 10 unique EAN-13 values. All 10 pass the GS1 modulo-10 check-digit calculation. Live tests used documented JSON endpoints, a descriptive user agent, bounded timeouts, and exact identifier checks. A search result was not counted merely because it was first or similar.

The fields evaluated were title, brand or publisher, category, image, and exact product identifier. Results are a point-in-time coverage sample, not a guarantee of future availability or correctness.

## Live results

| Barcode | UPCitemdb | Open Products Facts | Open Food Facts | Google Books | Open Library |
| --- | --- | --- | --- | --- | --- |
| `8904042611915` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `9789361059537` | No exact match | HTTP 404 | HTTP 404 | HTTP 429, inconclusive | No exact match |
| `9788184953671` | Exact: *Vedic Mathematics Made Easy-telegu*; category; no image | HTTP 404 | HTTP 404 | HTTP 429, inconclusive | No exact match |
| `8901599152014` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `8901860010432` | Exact: *10 X Pidilite Flex Kwik Instant Adhesive 20g Plastic Metal Wood Rubber Wholesale*; brand and category; no image | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `8901765118318` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `8904379408608` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `8902251383050` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `8901765097286` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |
| `8901425037195` | No exact match | HTTP 404 | HTTP 404 | Not an ISBN | Not an ISBN |

Coverage summary:

| Provider | Exact hits / attempted | Useful images | Interpretation |
| --- | ---: | ---: | --- |
| UPCitemdb trial | 2 / 10 | 0 / 2 | Useful fallback, inadequate as the only source |
| Open Products Facts v3 | 0 / 10 | 0 | Open but no coverage in this sample |
| Open Food Facts v3 | 0 / 10 | 0 | Wrong domain for stationery and books |
| Open Library Search API | 0 / 2 ISBNs | 0 | Valid fallback, no sample coverage |
| Google Books API | 0 conclusive / 2 | Unknown | Caller received HTTP 429; do not interpret as catalogue misses |

### Response evidence

The useful UPCitemdb response fields normalized to these excerpts:

```json
{
  "ean": "9788184953671",
  "title": "Vedic Mathematics Made Easy-telegu",
  "category": "Media > Books",
  "images": []
}
```

```json
{
  "ean": "8901860010432",
  "title": "10 X Pidilite Flex Kwik Instant Adhesive 20g Plastic Metal Wood Rubber Wholesale",
  "brand": "Pidilite",
  "category": "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Tools",
  "images": []
}
```

The batch containing `8901599152014` returned one item for the other requested code, not for `8901599152014`. This is why response-level exact identifier validation is mandatory even for a lookup endpoint. Empty UPCitemdb batches returned `total: 0`.

Open Library returned the following shape for each supplied ISBN:

```json
{
  "numFound": 0,
  "numFoundExact": true,
  "docs": []
}
```

Both Open Facts deployments returned HTTP 404 for every exact product endpoint. Google Books returned HTTP 429 for both attempts from the current network. The documented API supports `q=isbn:<value>` and exposes `volumeInfo.industryIdentifiers`, but production calls should identify the project with an API key and handle quotas and `Retry-After`.

## Provider assessment

### Google Books

- Best first choice for ISBN-10/ISBN-13 enrichment because it exposes title, authors, publisher, description, categories, identifiers, and cover links.
- Public-data searches do not need user OAuth, but Google documents an API key or access token as the application identifier.
- Never trust result order. Inspect all returned `industryIdentifiers` for the scanned ISBN.
- The live calls were rate-limited, so this run proves required error handling, not sample coverage.

Documentation: <https://developers.google.com/books/docs/v1/using>

### Open Library

- Free JSON API and cover service, suitable for low-volume human-facing book discovery.
- Default limit is one request/second or three requests/second for an identified client. Cache responses.
- Its usage guide says not to scrape HTML and not to use the API as a high-traffic third-party backend. Bulk consumers should use data dumps.
- Neither supplied ISBN was present in the live search.

Documentation: <https://openlibrary.org/developers/api>

### UPCitemdb

- The no-signup trial accesses the full database and returns title, brand, category, description, images, and exact identifier fields.
- Free limits are 100 combined requests/day, six lookup requests/minute, and a sustainable rate of one request per 10 seconds. A request can contain two barcodes.
- Data is supplied as-is without accuracy or availability guarantees. Treat it as a fallback and preserve provenance.
- The observed 2/10 overall and 1/8 non-book hit rates are too low for it to be the sole production provider.

Documentation: <https://www.upcitemdb.com/wp/docs/main/development/plan/>

### Open Products Facts and Open Food Facts

- Read access is open and unauthenticated with a custom user agent. Product reads are limited to 15 requests/minute/IP.
- Open Food Facts is food-specific, crowd-sourced, and explicitly provides no assurance that records are complete or reliable.
- Open Products Facts is relevant in concept for non-food goods but had no records for this sample.
- Their open-data and image licences require review before redistributing cached data or images.

Documentation: <https://openfoodfacts.github.io/openfoodfacts-server/api/>

### EAN-Search, Barcode Lookup, and DataKart

These were researched but not queried because no credentials were supplied:

- EAN-Search advertises title/category lookup across a large catalogue, but API access is not free. Its trial is 100 queries/month for EUR 1 in the first month, then EUR 9/month.
- Barcode Lookup requires an API key. It offers a test account; the published production entry plan is 5,000 calls for USD 99/month.
- GS1 India DataKart offers structured, near-real-time, brand-supplied data and HSN codes. Retailers must submit an enquiry and be contacted for access; the public page does not document anonymous API access or public pricing.

DataKart should be tested next because authoritative Indian coverage matters more than a nominally large global database. Run the same 10-code matrix after access is approved, and confirm API format, quotas, caching, image reuse, and export rights in writing.

## Prototype usage

Python 3.10 or later is required. For production Google Books requests, set `GOOGLE_BOOKS_API_KEY` in the host environment rather than putting the key in source control.

```powershell
$env:GOOGLE_BOOKS_API_KEY = "your-key"
python core/provider_research/barcode_lookup.py 9788184953671 8901860010432
```

The command emits normalized JSON plus an `attempts` array that distinguishes `not_found` from provider errors such as HTTP 429. This distinction prevents a temporary outage or quota response from being cached as a permanent miss.

### Structured web fallback

When a search service, retailer integration, or user supplies likely product-page URLs, pass each page explicitly:

```powershell
python core/provider_research/barcode_lookup.py 8901860010432 `
  --candidate-url "https://retailer.example/products/flex-kwik"
```

The fallback in [web_scrape_fallback.py](web_scrape_fallback.py) runs only after API providers miss. It fetches public HTTPS pages that permit the configured user agent in `robots.txt`, limits downloads to 2 MB, and parses schema.org `Product` JSON-LD. A record is accepted only when a `gtin`, `gtin8`, `gtin12`, `gtin13`, `gtin14`, `isbn`, or `productID` value exactly matches the scanned barcode. Visible page text, search ranking, SKU values, and similar product names are never treated as proof of identity.

This module deliberately does not scrape Google, Bing, or retailer search-result HTML. "Anywhere online" discovery requires a supported search API or a self-hosted search service to produce candidate URLs; this fallback then verifies those pages. Before enabling a domain in production, review its terms, keep a domain allowlist, add per-domain rate limits, and confirm that storing its text and images is permitted.

Run the offline tests with:

```powershell
python -m unittest discover -s core/provider_research -p "test_*.py"
```

Python was not installed in the research environment, so the tests could not be executed here. VS Code static diagnostics reported no errors in either Python file.

## Production hardening

Before integrating this prototype into a UI:

- Add SQLite positive and negative caching with shorter TTLs for misses.
- Add per-provider rate limiting, exponential backoff with jitter, and `Retry-After` support.
- Batch UPCitemdb lookups in pairs on the free plan and monitor its rate-limit response headers.
- Merge complementary exact records only with field-level provenance; do not silently overwrite conflicting titles or brands.
- Add a manual confirmation workflow because provider text can be inaccurate and the sample had no usable images.
- Re-run a larger labelled test of at least 50-100 local products before choosing a paid provider.
- Review provider terms for metadata and image storage separately. An API response does not automatically grant unrestricted image reuse.