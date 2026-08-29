import type { ProductMetadata } from "./types";

function download(name: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportJson(product: ProductMetadata): void {
  download(`${product.barcode}.json`, JSON.stringify(product, null, 2), "application/json");
}

export function exportCsv(product: ProductMetadata): void {
  const headers = ["Barcode", "Format", "Title", "Brand", "Description", "Image URL", "Sources"];
  const row = [product.barcode, product.barcodeFormat, product.title, product.brand, product.description, product.imageUrls?.[0], product.sources.map(({ name }) => name).join("; ")];
  download(`${product.barcode}.csv`, `${headers.map(csvCell).join(",")}\r\n${row.map(csvCell).join(",")}\r\n`, "text/csv;charset=utf-8");
}

export function exportVyaparCsv(product: ProductMetadata): void {
  const headers = ["Item Name", "Item Code", "Brand", "Description", "Image URL"];
  const row = [product.title || product.barcode, product.barcode, product.brand, product.description, product.imageUrls?.[0]];
  download(`${product.barcode}-vyapar.csv`, `${headers.map(csvCell).join(",")}\r\n${row.map(csvCell).join(",")}\r\n`, "text/csv;charset=utf-8");
}
