# Exporter plugins

`modules/exporters` converts validated `ProductMetadata` records into target-specific tabular files or documents. Exporters must remain independent of scanners, network providers, and platform UI code.

## Inputs and outputs

Input: one or more `ProductMetadata` records and exporter options. Output: a deterministic CSV, XLSX-compatible worksheet, JSON document, or target-specific payload plus validation diagnostics.

## Extending exporters

Implement the base exporter contract with a target identifier, input-schema version support, column mapping, row transformation, validation, and serialization. Keep target defaults in the exporter and expose only documented options to callers. Add fixtures for empty optional fields, multiple images, and unsupported schema versions.

## Vyapar import mapping

Use the following initial layout mapping for a Vyapar Excel import worksheet; adapt exact column names to the import template supplied by the installed Vyapar version.

| Worksheet column | `ProductMetadata` path | Transformation |
| --- | --- | --- |
| Item Name | `title` | Use title; fall back to barcode |
| Item Code | `barcode` | Preserve normalized EAN/UPC as text |
| Brand | `brand` | Leave blank when unavailable |
| Description | `description` | Plain text |
| Image URL | `imageUrls[0]` | First resolved image URL |

## Roadmap

Add a base exporter interface, CSV/JSON reference exporters, XLSX generation, target-template versioning, and row-level error reporting.
