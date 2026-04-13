import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
      },
      (errorMessage) => {
        // Silently handle scan errors
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, []); // Remove onScan from dependency to avoid re-renders if onScan is not memoized

  return (
    <Card className="p-4 relative bg-black/90 border-zinc-800">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-2 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-white">Scan QR Code</h3>
        <p className="text-sm text-zinc-400">Point your camera at the volunteer's QR code</p>
      </div>
      <div id="qr-reader" className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900" />
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </Card>
  );
}
