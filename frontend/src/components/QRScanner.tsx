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
    <div className="corner-card p-8 pt-10 relative bg-[#15171A] border-[#95FF00]/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-[#95FF00]/20 uppercase tracking-widest pointer-events-none">
        sys.sensor.optical
      </div>
      
      <Button 
        variant="ink" 
        size="sm" 
        className="absolute right-4 top-4 h-8 w-8 p-0 border-white/5 text-white/40 hover:text-white z-20"
        onClick={onClose}
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="text-center mb-8 space-y-2 relative z-10">
        <div className="flex items-center justify-center gap-3 text-[#95FF00] mb-2">
          <div className="w-8 h-[1px] bg-[#95FF00]/30" />
          <h3 className="text-[11px] font-black tracking-[0.4em] uppercase">Optical_Input</h3>
          <div className="w-8 h-[1px] bg-[#95FF00]/30" />
        </div>
        <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] max-w-[200px] mx-auto">Align vector with target scanner node</p>
      </div>

      <div className="relative group">
        {/* HUD Corner Brackets */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-[#95FF00] z-20 transition-all group-hover:-top-3 group-hover:-left-3" />
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-[#95FF00] z-20 transition-all group-hover:-top-3 group-hover:-right-3" />
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-[#95FF00] z-20 transition-all group-hover:-bottom-3 group-hover:-left-3" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-[#95FF00] z-20 transition-all group-hover:-bottom-3 group-hover:-right-3" />

        <div className="relative overflow-hidden border border-white/5 bg-black/40">
          <div id="qr-reader" className="min-h-[300px]" />
          
          {/* Internal HUD Elements */}
          <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-[#95FF00]/20 rounded-full" />
          
          {/* Scanner Line Overlay */}
          <div className="scanner-line absolute top-0 left-0 w-full h-[1px] bg-[#95FF00] shadow-[0_0_15px_#95FF00] pointer-events-none z-50"></div>
        </div>
      </div>

      {error && (
        <div className="mt-8 border border-red-500/20 bg-red-500/5 p-3 text-[9px] uppercase tracking-widest text-red-500 font-mono text-center">
          SENSOR_ERROR: {error}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 flex justify-between items-center text-[7px] font-mono text-white/10 uppercase tracking-widest">
        <span>FPS_SYS: 10.0</span>
        <span>STREAM_RAW_ENC: BASE64</span>
      </div>
    </div>
  );
}
