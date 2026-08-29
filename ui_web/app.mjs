export function formatBarcodeDetails(details) {
  return JSON.stringify(details, null, 2);
}

export class ApiError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function getBarcodeDetails(barcode, dataSource = "test-search", fetchImpl = globalThis.fetch) {
  let response;
  try {
    const query = new URLSearchParams({ barcode: barcode.trim(), source: dataSource });
    response = await fetchImpl(`/api/details?${query}`, {
      headers: { accept: "application/json" },
    });
  } catch (cause) {
    throw new ApiError(
      "CORE_API_UNREACHABLE",
      "The core API could not be reached. Confirm that the server is running.",
      { cause },
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw new ApiError(
      "INVALID_API_RESPONSE",
      `The core API returned an invalid response (HTTP ${response.status}).`,
      { cause },
    );
  }
  if (!response.ok) {
    throw new ApiError(
      body.code || "LOOKUP_FAILED",
      body.error || `Lookup failed with HTTP ${response.status}.`,
    );
  }
  return body;
}

if (typeof document !== "undefined") {
  const form = document.getElementById("barcode-form");
  const barcode = document.getElementById("barcode");
  const details = document.getElementById("details");
  const dataSource = document.getElementById("data-source");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    dataSource.disabled = true;
    details.value = "Loading…";
    try {
      details.value = formatBarcodeDetails(await getBarcodeDetails(barcode.value, dataSource.value));
    } catch (error) {
      details.value = formatBarcodeDetails({
        status: "error",
        code: error instanceof ApiError ? error.code : "LOOKUP_FAILED",
        error: error instanceof Error ? error.message : "The lookup failed.",
      });
    } finally {
      dataSource.disabled = false;
    }
  });
}