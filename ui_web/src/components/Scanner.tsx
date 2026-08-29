import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { ImageUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ScannerProps {
  onScan(value: string): void;
  onClose(): void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls>();
  const [message, setMessage] = useState("Point the camera at an EAN, UPC, or ISBN barcode.");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    if (!videoRef.current) return;
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result) {
        controlsRef.current?.stop();
        onScan(result.getText());
      }
    }).then((controls) => { controlsRef.current = controls; }).catch(() => {
      setMessage("Camera access failed. Upload a barcode photo or enter the number manually.");
    });
    return () => controlsRef.current?.stop();
  }, [onScan]);

  async function scanImage(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      onScan(result.getText());
    } catch {
      setMessage("No barcode was found in that image. Try a sharper, well-lit photo.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="scanner-backdrop" role="dialog" aria-modal="true" aria-label="Barcode scanner">
      <section className="scanner-panel">
        <button className="icon-button scanner-close" onClick={onClose} aria-label="Close scanner"><X /></button>
        <div className="camera-frame"><video ref={videoRef} muted playsInline /><span className="scan-line" /></div>
        <p>{message}</p>
        <label className="button secondary upload-button">
          <ImageUp size={18} /> Scan a photo
          <input type="file" accept="image/*" capture="environment" onChange={(event) => void scanImage(event.target.files?.[0])} />
        </label>
      </section>
    </div>
  );
}
