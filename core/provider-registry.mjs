import { readdir } from "node:fs/promises";
import { createProvider } from "./provider-protocol.mjs";

export const PROVIDER_FILE_SUFFIX = ".provider.mjs";

export async function discoverProviders({
  directoryUrl = new URL("./providers/", import.meta.url),
  readDirectory = readdir,
  importProvider = (url) => import(url.href),
} = {}) {
  const fileNames = (await readDirectory(directoryUrl))
    .filter((fileName) => fileName.endsWith(PROVIDER_FILE_SUFFIX))
    .sort();

  const providers = [];
  const ids = new Set();
  for (const fileName of fileNames) {
    const module = await importProvider(new URL(fileName, directoryUrl));
    const provider = createProvider(module.provider);
    if (ids.has(provider.id)) {
      throw new TypeError(`Duplicate provider id "${provider.id}".`);
    }
    ids.add(provider.id);
    providers.push(provider);
  }

  if (providers.length === 0) {
    throw new TypeError(`No ${PROVIDER_FILE_SUFFIX} providers were discovered.`);
  }

  return Object.freeze(providers);
}

export const registeredProviders = await discoverProviders();