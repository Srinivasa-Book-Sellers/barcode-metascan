import { assertProviderResponse } from "./provider-protocol.mjs";

const REQUIRED_BARCODE_LENGTH = 13;

export class BarcodeValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BarcodeValidationError";
    this.code = code;
    this.status = 422;
  }
}

export function validateBarcode(value) {
  const barcode = String(value ?? "").trim();

  if (!/^\d*$/.test(barcode)) {
    throw new BarcodeValidationError(
      "BARCODE_INVALID_FORMAT",
      "Barcode must contain digits only.",
    );
  }
  if (barcode.length < REQUIRED_BARCODE_LENGTH) {
    throw new BarcodeValidationError(
      "BARCODE_TOO_SHORT",
      `Barcode must contain exactly ${REQUIRED_BARCODE_LENGTH} digits.`,
    );
  }
  if (barcode.length > REQUIRED_BARCODE_LENGTH) {
    throw new BarcodeValidationError(
      "BARCODE_TOO_LONG",
      `Barcode must contain exactly ${REQUIRED_BARCODE_LENGTH} digits.`,
    );
  }

  return barcode;
}

export class BarcodeLookup {
  constructor({ providers }) {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new TypeError("At least one barcode provider is required.");
    }
    for (const provider of providers) {
      if (!provider || typeof provider.lookup !== "function") {
        throw new TypeError("Every barcode provider must implement lookup(barcode).");
      }
    }
    this.providers = providers;
  }

  async lookup(value) {
    const barcode = validateBarcode(value);
    // Additional providers can be tried here when fallback resolution is introduced.
    const provider = this.providers[0];
    const result = await provider.lookup(barcode);
    return assertProviderResponse(result, {
      barcode,
      providerId: provider.id ?? provider.name ?? "unknown",
    });
  }
}