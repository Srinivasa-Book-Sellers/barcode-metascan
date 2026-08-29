const PROVIDER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRING_FIELDS = ["title", "brand", "description", "category"];

export class ProviderContractError extends Error {
  constructor(providerId, message) {
    super(`Provider "${providerId}" returned an invalid response: ${message}`);
    this.name = "ProviderContractError";
    this.code = "INVALID_PROVIDER_RESPONSE";
    this.status = 502;
  }
}

export function defineProvider({ id, name, create } = {}) {
  if (typeof id !== "string" || !PROVIDER_ID_PATTERN.test(id)) {
    throw new TypeError("Provider id must be a non-empty kebab-case string.");
  }
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError(`Provider "${id}" must have a display name.`);
  }
  if (typeof create !== "function") {
    throw new TypeError(`Provider "${id}" must define a create function.`);
  }

  return Object.freeze({ id, name: name.trim(), create });
}

export function createProvider(definition, options = {}) {
  const checkedDefinition = defineProvider(definition);
  const provider = checkedDefinition.create(options);

  if (!provider || typeof provider.lookup !== "function") {
    throw new TypeError(`Provider "${checkedDefinition.id}" must implement lookup(barcode).`);
  }

  return Object.assign(provider, {
    id: checkedDefinition.id,
    name: checkedDefinition.name,
  });
}

function assertIsoDate(value, field, providerId) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new ProviderContractError(providerId, `${field} must be an ISO date string.`);
  }
}

export function assertProviderResponse(value, { barcode, providerId }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderContractError(providerId, "the result must be an object.");
  }
  if (value.schemaVersion !== "1.0") {
    throw new ProviderContractError(providerId, 'schemaVersion must be "1.0".');
  }
  if (value.barcode !== barcode) {
    throw new ProviderContractError(providerId, "barcode must match the requested barcode.");
  }
  if (value.barcodeFormat !== "EAN_13") {
    throw new ProviderContractError(providerId, 'barcodeFormat must be "EAN_13".');
  }
  assertIsoDate(value.resolvedAt, "resolvedAt", providerId);

  for (const field of STRING_FIELDS) {
    if (value[field] !== undefined && typeof value[field] !== "string") {
      throw new ProviderContractError(providerId, `${field} must be a string when provided.`);
    }
  }

  if (value.imageUrls !== undefined && (
    !Array.isArray(value.imageUrls)
    || value.imageUrls.some((url) => typeof url !== "string" || url === "")
  )) {
    throw new ProviderContractError(providerId, "imageUrls must contain only non-empty strings.");
  }

  if (value.sources !== undefined) {
    if (!Array.isArray(value.sources)) {
      throw new ProviderContractError(providerId, "sources must be an array when provided.");
    }
    for (const source of value.sources) {
      if (!source || typeof source !== "object"
        || typeof source.name !== "string" || source.name === ""
        || typeof source.url !== "string" || source.url === "") {
        throw new ProviderContractError(
          providerId,
          "each source must contain non-empty name and url strings.",
        );
      }
      assertIsoDate(source.retrievedAt, "sources[].retrievedAt", providerId);
    }
  }

  return value;
}