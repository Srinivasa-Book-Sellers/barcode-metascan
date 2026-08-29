# barcode-metascan

`barcode-metascan` is an industry-agnostic utility for resolving EAN and UPC barcodes into structured product metadata. It supports a cache-first, multi-source lookup pipeline and produces universal CSV/JSON files plus layouts tailored to Vyapar bulk imports.

## Architecture

```text
.
├── .github/                 # Repository automation and contributor guidance
│   ├── workflows/ci.yml     # Documentation and scaffold quality checks
│   └── README.md
├── core/                    # Scanner, lookup, fallback, and cache services
│   └── README.md
├── models/                  # Shared product metadata contracts
│   └── README.md
├── modules/
│   └── exporters/           # Pluggable CSV, JSON, and retail exports
│       └── README.md
├── ui_android/              # Android camera-scanning integration layer
│   └── README.md
└── ui_windows/              # Windows desktop and USB-peripheral layer
    └── README.md
```

## Prerequisites

- Git
- A current LTS runtime for the implementation chosen by each UI layer
- Android Studio and Android SDK for Android development
- Visual Studio 2022 or later with desktop development tooling for Windows development

## Quick start

1. Clone the repository and review the module READMEs above.
2. Implement the shared `ProductMetadata` contract in `models/`.
3. Build cache, API-provider, and fallback adapters in `core/`.
4. Add an exporter in `modules/exporters/`, then connect the platform UI layers.
5. Run the repository checks locally with the commands described in `.github/README.md`.

## Roadmap

| Status | Feature |
| --- | --- |
| [ ] | Define and validate the versioned `ProductMetadata` contract |
| [ ] | Add EAN/UPC scanner adapters for USB devices and Android cameras |
| [ ] | Implement SQLite cache and public metadata-source providers |
| [ ] | Add resilient, policy-compliant web fallback adapters |
| [ ] | Ship CSV, JSON, and Vyapar spreadsheet exporters |
| [ ] | Add Windows desktop and Android application shells |
| [ ] | Add provider, exporter, and end-to-end test coverage |

## Contributing

Keep platform-specific code in its UI directory, place portable contracts in `models/`, and keep provider/exporter integrations decoupled. See each module README for its boundary and extension points.
