# Web UI

This folder contains the browser interface for Barcode MetaScan. The first increment is a plain HTML page with no framework or build dependencies.

## Run locally

From the repository root, start a local server:

```sh
python3 -m http.server 8080 --directory ui_web
```

Then open <http://localhost:8080> in a browser.

Stop the server with `Ctrl+C`.

## Automated check

The `Web UI check` GitHub Actions workflow verifies that the HTML entry page exists and contains the expected heading. It does not publish or deploy the website.
