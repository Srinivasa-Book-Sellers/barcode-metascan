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

## Provider protocol and automatic registration

The common lookup wrapper in `barcode-lookup.mjs` validates every barcode before a
provider is called. Short and long values return `BARCODE_TOO_SHORT` and
`BARCODE_TOO_LONG`, respectively. This validation is shared by current and future
providers.

Provider modules live in `providers/` and use the `*.provider.mjs` suffix. The registry
discovers these modules automatically at startup, validates their exported provider
definition, and creates them without a manually maintained factory list. Each definition
declares a stable kebab-case ID, display name, and factory. Each created provider must
implement `async lookup(barcode)`.

The lookup wrapper validates every provider result against the shared `ProductMetadata`
contract before returning it to the HTTP API. Invalid responses fail with
`INVALID_PROVIDER_RESPONSE` rather than exposing provider-specific data to consumers.
See `providers/README.md` for the provider template and registration rules.

## Test Search provider

The only currently registered provider is implemented in
`providers/test-search.provider.mjs`. It always returns
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

The HTTP layer also accepts an explicitly supplied provider list for tests and embedding.
These providers are subject to the same request and response protocol.

## Roadmap

Add scanner abstractions, SQLite migrations and TTL handling, provider retry/rate-limit policy, provenance scoring, and test fixtures for each provider.
