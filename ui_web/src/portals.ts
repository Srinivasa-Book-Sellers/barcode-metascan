export interface Portal {
  name: string;
  note: string;
  url: string;
  accent: string;
}

export function portalsFor(barcode: string): Portal[] {
  return [
    { name: "EAN-Search", note: "General EAN/GTIN catalogue", url: `https://www.ean-search.org/?q=${encodeURIComponent(barcode)}`, accent: "#397367" },
    { name: "Barcode Lookup", note: "Consumer product catalogue", url: `https://www.barcodelookup.com/${encodeURIComponent(barcode)}`, accent: "#c06b3e" },
    { name: "Google Books", note: "ISBN title and cover data", url: `https://www.google.com/search?tbm=bks&q=isbn%3A${encodeURIComponent(barcode)}`, accent: "#3d6b9c" },
    { name: "Open Library", note: "Open ISBN bibliography", url: `https://openlibrary.org/isbn/${encodeURIComponent(barcode)}`, accent: "#8a6841" },
    { name: "GS1 India DataKart", note: "Official portal; account required", url: "https://www.gs1india.org/datakart/datakart-for-retailers", accent: "#7653a6" },
  ];
}
