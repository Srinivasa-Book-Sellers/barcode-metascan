import type { BarcodeFormat } from "./types.js";

export interface ParsedBarcode {
  value: string;
  format: BarcodeFormat;
}

function hasValidGtinCheckDigit(value: string): boolean {
  const digits = [...value].map(Number);
  const check = digits.pop();
  if (check === undefined) return false;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function hasValidIsbn10CheckDigit(value: string): boolean {
  const sum = [...value].reduce((total, character, index) => {
    const digit = character === "X" ? 10 : Number(character);
    return total + digit * (10 - index);
  }, 0);
  return sum % 11 === 0;
}

export function parseBarcode(raw: string): ParsedBarcode {
  const value = raw.trim().toUpperCase().replace(/[\s-]/g, "");

  if (/^\d{9}[\dX]$/.test(value)) {
    if (!hasValidIsbn10CheckDigit(value)) throw new Error("ISBN-10 check digit is invalid");
    return { value, format: "ISBN_10" };
  }
  if (/^\d{12}$/.test(value)) {
    if (!hasValidGtinCheckDigit(value)) throw new Error("UPC-A check digit is invalid");
    return { value, format: "UPC_A" };
  }
  if (/^\d{13}$/.test(value)) {
    if (!hasValidGtinCheckDigit(value)) throw new Error("EAN-13 check digit is invalid");
    return { value, format: value.startsWith("978") || value.startsWith("979") ? "ISBN_13" : "EAN_13" };
  }
  throw new Error("Enter a valid EAN-13, UPC-A, ISBN-10, or ISBN-13 barcode");
}

export function isBookFormat(format: BarcodeFormat): boolean {
  return format === "ISBN_10" || format === "ISBN_13";
}
