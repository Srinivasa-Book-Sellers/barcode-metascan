# Web UI

This folder contains the browser interface for Barcode MetaScan. It is a plain HTML page with no framework or build dependencies.

Enter an exact 13-digit barcode and press **Enter** to request deterministic sample metadata from the core API and display its JSON response. The data-source list currently contains only **Test Search**, which makes no external API request.

Lookup failures, including `BARCODE_TOO_SHORT`, `BARCODE_TOO_LONG`, invalid formats,
and core API connection failures, are displayed in the JSON details field. The source
selector is disabled while a request is active and is always re-enabled afterward.

## Run locally

Start the core server from the repository root:

```sh
node core/server.mjs
```

Then open <http://localhost:8080> in a browser.

Stop the server with `Ctrl+C`.

## Automated check

The `Web UI check` GitHub Actions workflow verifies the HTML entry page and tests the barcode form with Node's built-in test runner. It does not publish or deploy the website.
