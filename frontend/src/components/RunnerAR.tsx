import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair } from 'lucide-react';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import * as THREE from 'three';

// ─── AR STATE ─────────────────────────────────────────────────
type ARState = 'booting' | 'searching' | 'locked' | 'captured' | 'failed';

const STATE_CONFIG: Record<ARState, { label: string; color: string; pulse?: boolean }> = {
  booting:    { label: '⟐ INITIALIZING OPTICAL LINK...', color: '#ffffff66' },
  searching:  { label: '📡 SCANNING FOR TARGET...', color: '#00ccff', pulse: true },
  locked:     { label: '🎯 TARGET ACQUIRED', color: '#00ffcc', pulse: false },
  captured:   { label: '✅ UPLINK COMPLETE', color: '#00ff88' },
  failed:     { label: '⚠️ SENSOR FAILURE', color: '#ff4444' },
};

interface RunnerARProps {
  round: number;
  token: string;
  onCapture: (gps: { lat: number; lng: number }) => void;
  onFail: () => void;
}

export default function RunnerAR({ round, onCapture, onFail }: RunnerARProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<any>(null);
  const [arState, setArState] = useState<ARState>('booting');
  const [error, setError] = useState<string | null>(null);
  const capturedRef = useRef(false);
  const onCaptureRef = useRef(onCapture);
  const onFailRef = useRef(onFail);

  useEffect(() => {
    onCaptureRef.current = onCapture;
    onFailRef.current = onFail;
  }, [onCapture, onFail]);

  useEffect(() => {
    capturedRef.current = false;
    let cancelled = false;

    // Force transparency for the camera feed to show through
    document.body.classList.add('ar-active');

    const start = async () => {
      try {
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
          setError('HTTPS REQUIRED: Mobile browsers block camera on HTTP.');
          setArState('failed');
          return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('BROWSER INCOMPATIBLE: MediaDevices API not found.');
          setArState('failed');
          return;
        }

        if (cancelled || !containerRef.current) return;

        const mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: `/targets/r${round}.mind`,
          maxTrack: 1,
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no',
        });
        mindarRef.current = mindarThree;

        // Mobile Video Fix: Force attributes immediately on element injection
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'VIDEO') {
                const v = node as HTMLVideoElement;
                v.setAttribute('playsinline', '');
                v.setAttribute('webkit-playsinline', '');
                v.muted = true;
                v.style.zIndex = '1';
              } else if (node.nodeName === 'CANVAS') {
                (node as HTMLElement).style.zIndex = '2';
              }
            });
          });
        });
        if (containerRef.current) observer.observe(containerRef.current, { childList: true });

        await mindarThree.start();
        observer.disconnect();

        if (cancelled) {
          mindarThree.stop();
          return;
        }

        const { renderer, scene, camera } = mindarThree;
        if (!camera || !renderer) throw new Error('AR initialization failed');

        renderer.setClearColor(0x000000, 0);

        // Force Layering via JS
        const video = containerRef.current?.querySelector('video');
        const canvas = containerRef.current?.querySelector('canvas');
        if (video) video.style.setProperty('z-index', '1', 'important');
        if (canvas) canvas.style.setProperty('z-index', '2', 'important');

        const anchor = mindarThree.addAnchor(0);

        // ─── Tactical Target Object ───
        const geometry = new THREE.RingGeometry(0.12, 0.18, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ffcc,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const ring = new THREE.Mesh(geometry, material);

        const innerGeometry = new THREE.CircleGeometry(0.06, 32);
        const innerMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x00ffcc, 
          opacity: 0.3, 
          transparent: true 
        });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);

        anchor.group.add(ring);
        anchor.group.add(inner);

        anchor.onTargetFound = () => {
          if (capturedRef.current) return;
          setArState('locked');

          // Haptics
          try { navigator.vibrate?.([100, 50, 200]); } catch { }

          // Sound
          try {
            const audio = new Audio('/sounds/mixkit-sci-fi-positive-notification-266.wav');
            audio.volume = 0.5;
            audio.play().catch(() => { }); 
          } catch { }

          setTimeout(() => {
            if (capturedRef.current || cancelled) return;
            capturedRef.current = true;
            setArState('captured');

            navigator.geolocation.getCurrentPosition(
              (pos) => onCaptureRef.current({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => onCaptureRef.current({ lat: 0, lng: 0 }),
              { enableHighAccuracy: true, timeout: 5000 }
            );
          }, 1200);
        };

        anchor.onTargetLost = () => {
          if (!capturedRef.current) setArState('searching');
        };

        setArState('searching');

        renderer.setAnimationLoop(() => {
          if (cancelled) return;
          ring.rotation.z += 0.02;
          renderer.render(scene, camera);
        });

      } catch (err: any) {
        if (cancelled) return;
        console.error('[RunnerAR] Init Error:', err);
        setError(err.message || 'Sensor failure.');
        setArState('failed');
      }
    };

    const bootTimeout = setTimeout(() => {
      if (!cancelled) start();
    }, 400); 

    return () => {
      cancelled = true;
      clearTimeout(bootTimeout);
      document.body.classList.remove('ar-active');
      if (mindarRef.current) {
        try { mindarRef.current.stop(); } catch (e) { }
        mindarRef.current = null;
      }
    };
  }, [round]);

  const state = STATE_CONFIG[arState];

  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', background: 'transparent', overflow: 'hidden' }}>
      {/* ── AR Container ── */}
      <div 
        ref={containerRef} 
        className="mindar-container"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'hidden', background: 'transparent' }} 
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .mindar-container video {
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important; height: 100% !important;
          object-fit: cover !important;
          z-index: 1 !important;
        }
        .mindar-container canvas {
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important; height: 100% !important;
          z-index: 2 !important;
          pointer-events: none !important;
        }
      `}} />

      {/* ── Tactical HUD Overlay ── */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8">
        {/* Top Header */}
        <div className="w-full flex justify-between items-start pt-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${arState === 'searching' ? 'animate-pulse bg-blue-400' : 'bg-green-400'}`} />
            <span className="text-[10px] font-mono tracking-[0.3em] text-white/60">SENSORS: ACTIVE</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono tracking-[0.3em] text-white/60 uppercase">Target: L-{round}</div>
          </div>
        </div>

        {/* Center Crosshair (Only when searching) */}
        <AnimatePresence>
          {arState === 'searching' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="relative flex items-center justify-center"
            >
              <div className="absolute w-48 h-48 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute w-64 h-64 border-t border-b border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
              <Crosshair className="text-white/20 w-8 h-8" strokeWidth={1} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Status Bar */}
        <div className="w-full max-w-xs space-y-4 pb-12">
          <div className="glass-morphism border-t-2 p-4 text-center" style={{ borderColor: state.color }}>
            <div 
              className={`text-xs font-bold tracking-[0.2em] uppercase ${state.pulse ? 'animate-pulse' : ''}`}
              style={{ color: state.color }}
            >
              {state.label}
            </div>
            {error && (
              <div className="mt-2 text-[10px] text-red-400 font-mono uppercase tracking-widest">{error}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Booting Overlay ── */}
      {arState === 'booting' && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full" />
            <div className="absolute inset-0 border-t-4 border-cyan-400 rounded-full animate-spin" />
          </div>
          <div className="text-cyan-400 text-xs font-bold tracking-[0.3em] animate-pulse uppercase">Initializing AR</div>
          <div className="mt-4 text-white/20 text-[10px] font-mono tracking-widest uppercase">Calibrating Optical Sensors...</div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
