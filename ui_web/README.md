# Web UI

This folder contains the browser interface for Barcode MetaScan. It is a plain HTML page with no framework or build dependencies.

Enter a barcode and select **Get Details** to display it as JSON. This UI-only increment does not make an API request.

## Run locally

From the repository root, start a local server:

```sh
python3 -m http.server 8080 --directory ui_web
```

Then open <http://localhost:8080> in a browser.

Stop the server with `Ctrl+C`.

## Automated check

The `Web UI check` GitHub Actions workflow verifies the HTML entry page and tests the barcode form with Node's built-in test runner. It does not publish or deploy the website.
