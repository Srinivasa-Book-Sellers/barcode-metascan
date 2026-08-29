export function formatBarcodeDetails(barcode) {
  return JSON.stringify({ barcode: barcode.trim() }, null, 2);
}

if (typeof document !== "undefined") {
  const form = document.getElementById("barcode-form");
  const barcode = document.getElementById("barcode");
  const details = document.getElementById("details");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    details.value = formatBarcodeDetails(barcode.value);
  });
}