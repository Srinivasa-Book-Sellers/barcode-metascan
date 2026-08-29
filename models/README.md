# Product metadata models

`models` defines strict, versioned, platform-neutral data contracts shared by core services, exporters, and UI layers.

## Inputs and outputs

Inputs are raw provider fields and normalized barcodes. The primary output is a validated `ProductMetadata` entity; consumers must not depend on provider-specific response shapes.

## Resolved profile example

```json
{
  "schemaVersion": "1.0",
  "barcode": "012345678905",
  "barcodeFormat": "UPC_A",
  "title": "Example Product",
  "brand": "Example Brand",
  "description": "A fully resolved example product.",
  "imageUrls": [
    "https://cdn.example.invalid/products/012345678905.jpg"
  ],
  "sources": [
    {
      "name": "Example Catalog",
      "url": "https://catalog.example.invalid/products/012345678905",
      "retrievedAt": "2026-08-29T00:00:00Z"
    }
  ],
  "resolvedAt": "2026-08-29T00:00:00Z"
}
```

Required fields are `schemaVersion`, `barcode`, `barcodeFormat`, and `resolvedAt`. `title`, `brand`, `description`, and `imageUrls` may be absent when no trustworthy source resolves them.

## Roadmap

Define language-specific validators from this contract, add optional category/pricing extensions, and publish schema compatibility rules.
