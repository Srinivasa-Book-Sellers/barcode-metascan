import { describe, expect, it } from "vitest";
import { parseBarcode } from "./barcode.js";

describe("parseBarcode", () => {
  it("recognizes a valid ISBN-13", () => {
    expect(parseBarcode("978-0-14-044913-6")).toEqual({ value: "9780140449136", format: "ISBN_13" });
  });

  it("recognizes a valid UPC-A", () => {
    expect(parseBarcode("012345678905")).toEqual({ value: "012345678905", format: "UPC_A" });
  });

  it("recognizes a valid ISBN-10 ending in X", () => {
    expect(parseBarcode("080442957X")).toEqual({ value: "080442957X", format: "ISBN_10" });
  });

  it("rejects a bad check digit", () => {
    expect(() => parseBarcode("9780140449137")).toThrow("check digit");
  });
});
