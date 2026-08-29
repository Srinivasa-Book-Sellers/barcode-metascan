# Lookup providers

Lookup providers are discovered automatically when the core registry starts. No separate
factory list needs to be edited.

## Provider convention

A provider module must:

1. Be placed in this directory with a `*.provider.mjs` file name.
2. Export a named `provider` definition created with `defineProvider()`.
3. Supply a stable, unique kebab-case `id`, a display `name`, and a `create` factory.
4. Create an object implementing `async lookup(barcode)`.
5. Return the shared `ProductMetadata` response described in `../../models/README.md`.

Example:

```js
import { defineProvider } from "../provider-protocol.mjs";

class ExampleProvider {
  async lookup(barcode) {
    return {
      schemaVersion: "1.0",
      barcode,
      barcodeFormat: "EAN_13",
      resolvedAt: new Date().toISOString(),
    };
  }
}

export const provider = defineProvider({
  id: "example",
  name: "Example API",
  create: (options) => new ExampleProvider(options),
});
```

Only files matching the naming convention are scanned. Startup fails immediately when a
matching file does not export a valid definition, creates an invalid provider, or duplicates
an existing provider ID. Every lookup response is checked at runtime before it reaches the
HTTP API, so provider-specific response shapes cannot leak into consumers.
