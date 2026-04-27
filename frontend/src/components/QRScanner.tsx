import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { TacticalStatus } from './TacticalStatus';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  // Prevent onScan from firing more than once per scanner mount
  const hasScanned = useRef(false);

  const stopScanner = () => {
    const instance = qrRef.current;
    if (!instance) return;
    qrRef.current = null;
    const state = instance.getState();
    const isActive =
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED;
    if (isActive) {
      instance.stop()
        .then(() => instance.clear())
        .catch(() => { })
        .finally(() => {
          const el = document.getElementById('qr-reader');
          if (el) el.innerHTML = '';
        });
    } else {
      const el = document.getElementById('qr-reader');
      if (el) el.innerHTML = '';
    }
  };

  useEffect(() => {
    const el = document.getElementById('qr-reader');
    if (el) el.innerHTML = '';
    hasScanned.current = false;

    const qr = new Html5Qrcode('qr-reader');
    qrRef.current = qr;

    const handleDecode = (decodedText: string) => {
      if (hasScanned.current) return; // Block all subsequent frames
      hasScanned.current = true;
      stopScanner(); // Stop the camera immediately
      onScan(decodedText);
    };

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      handleDecode,
      () => { /* ignore per-frame errors */ }
    ).catch(() => {
      // Fallback to 'user' facing camera if 'environment' fails (e.g. laptop webcam)
      qr.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleDecode,
        () => { /* ignore per-frame errors */ }
      ).catch(() => {
        setErrorMsg('Camera access denied or camera is currently in use by another app.');
      });
    });

    return () => { stopScanner(); };
  }, []);

  return (
    <div className="corner-card p-8 pt-10 relative bg-[var(--color-bg-void)] border-[var(--color-accent)]/20 shadow-black-lg">
      <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-[var(--color-accent)]/20 uppercase tracking-widest pointer-events-none">
        sys.sensor.optical
      </div>

      <Button
        size="sm"
        className="btn-secondary absolute right-4 top-4 h-8 w-8 p-0 border-white/5 text-white/40 hover:text-white z-20"
        onClick={onClose}
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="text-center mb-8 space-y-2 relative z-10">
        <div className="flex items-center justify-center gap-3 text-[var(--color-accent)] mb-2">
          <div className="w-8 h-[1px] bg-[var(--color-accent)]/30" />
          <h3 className="text-[11px] font-black tracking-[0.4em] uppercase">Optical_Input</h3>
          <div className="w-8 h-[1px] bg-[var(--color-accent)]/30" />
        </div>
        <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] max-w-[200px] mx-auto">
          Align vector with target scanner node
        </p>
      </div>

      <div className="relative group">
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-[var(--color-accent)] z-20 transition-all group-hover:-top-3 group-hover:-left-3" />
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-[var(--color-accent)] z-20 transition-all group-hover:-top-3 group-hover:-right-3" />
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-[var(--color-accent)] z-20 transition-all group-hover:-bottom-3 group-hover:-left-3" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-[var(--color-accent)] z-20 transition-all group-hover:-bottom-3 group-hover:-right-3" />

        <div className="relative overflow-hidden border border-white/5 bg-[var(--color-bg-surface)]">
          <div id="qr-reader" className="w-full min-h-[300px] flex items-center justify-center">
            {errorMsg && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60  p-6">
                <TacticalStatus
                  tone="error"
                  label="System Fault"
                  message={errorMsg}
                  icon={AlertCircle}
                />
              </div>
            )}
          </div>
          <div className="scanner-line absolute top-0 left-0 w-full h-[1px] bg-[var(--color-accent)] shadow-accent-sm pointer-events-none z-40" />
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center text-[7px] font-mono text-white/10 uppercase tracking-widest">
        <span>FPS_SYS: 10.0</span>
        <span>STREAM_RAW_ENC: BASE64</span>
      </div>
    </div>
  );
}
