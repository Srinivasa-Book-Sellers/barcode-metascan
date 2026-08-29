# Core metadata pipeline

`core` owns portable barcode acquisition adapters, provider abstractions, fallback retrieval, and the local SQLite cache. It must not contain Windows- or Android-specific UI code.

## Pipeline

For a normalized EAN/UPC, resolve data in this order:

1. **Local cache**: return a fresh, previously resolved `ProductMetadata` record.
2. **Public APIs**: query configured providers and normalize their responses.
3. **Web-scraping fallbacks**: use policy-compliant fallback adapters only when providers do not resolve enough data.
4. **Cache write-through**: persist successful normalized results and source provenance.

## Inputs and outputs

Input: an exact 13-digit EAN barcode, optional lookup policy, and provider credentials supplied through the host application's secure configuration.

Output: a unified JSON payload:

```json
{
  "barcode": "8901234567890",
  "barcodeFormat": "EAN_13",
  "title": "Example Product",
  "brand": "Example Brand",
  "description": "Example product description.",
  "imageUrls": ["https://cdn.example.invalid/product.jpg"],
  "sources": [{"name": "provider", "url": "https://example.invalid/product"}],
  "resolvedAt": "2026-08-29T00:00:00Z"
}
```

## Test Search provider

The common lookup wrapper in `barcode-lookup.mjs` validates every barcode before a
provider is called. Short and long values return `BARCODE_TOO_SHORT` and
`BARCODE_TOO_LONG`, respectively. This validation is shared by current and future
providers.

The initial provider is implemented in `test-search.mjs`. It always returns
deterministic sample product metadata, including a test title, brand, description,
category, and image. It makes no external requests and requires no credentials.

Run the local core API and web UI with:

```sh
node core/server.mjs
```

Open <http://localhost:8080>, or request the core endpoint directly:

```text
GET /api/details?barcode=4006381333931
```

The HTTP layer accepts a provider list, so real data sources can be added later
without coupling provider-specific response fields to the web UI.

## Roadmap

Add scanner abstractions, SQLite migrations and TTL handling, provider retry/rate-limit policy, provenance scoring, and test fixtures for each provider.
