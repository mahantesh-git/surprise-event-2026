import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import * as THREE from 'three';
import { AlertTriangle, Lock } from 'lucide-react';

interface RunnerGyroScannerProps {
  onCapture: (data: string) => void;
  onFail: (error: string) => void;
  round: number;
  targetData?: string;
  distance?: number | null;
  testingBypassEnabled?: boolean;
}

export const RunnerGyroScanner: React.FC<RunnerGyroScannerProps> = ({
  onCapture,
  onFail,
  round,
  targetData = `Round ${round} Active`,
  distance = null,
  testingBypassEnabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<'INITIALIZING' | 'SEARCHING' | 'LOCKED' | 'DECOY'>('INITIALIZING');
  const statusRef = useRef(status);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeRef = useRef<THREE.Object3D | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const requestRef = useRef<number>(0);
  const [scanProgress, setScanProgress] = useState(0);

  // Stabilization & Scanning Refs
  const targetQuaternion = useRef(new THREE.Quaternion());
  const initialOffset = useRef<number | null>(null);
  const lastScanTime = useRef<number>(0);
  const isTargetVisible = useRef(false);
  const targetDataRef = useRef(targetData);
  const distanceRef = useRef(distance);

  // Sync refs to state/props to avoid stale closures in animation loop
  useEffect(() => { targetDataRef.current = targetData; }, [targetData]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { statusRef.current = status; }, [status]);
  // Stable refs for callbacks to prevent useEffect from re-running
  const onFailRef = useRef(onFail);
  const onCaptureRef = useRef(onCapture);

  useEffect(() => { onFailRef.current = onFail; }, [onFail]);
  useEffect(() => { onCaptureRef.current = onCapture; }, [onCapture]);

  // --- 1. SENSOR PERMISSION ---
  // Track whether we need the manual button (iOS only — needs a user gesture)
  const [needsManualPermission, setNeedsManualPermission] = useState(false);

  const requestSensorPermission = async () => {
    try {
      // iOS specific permission request
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setNeedsManualPermission(false);
        } else {
          onFail('Sensor permission denied');
        }
      } else {
        // Android/Desktop — no explicit permission needed
        setPermissionGranted(true);
      }
    } catch (err) {
      console.error('Error requesting sensors:', err);
      setPermissionGranted(true); // Fallback
    }
  };

  // Auto-request on mount — skips the UI entirely on Android/desktop
  useEffect(() => {
    const autoRequest = async () => {
      try {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          // iOS: calling outside a user gesture will throw — show the manual button instead
          setNeedsManualPermission(true);
        } else {
          // Android / Desktop: grant immediately, no button needed
          setPermissionGranted(true);
        }
      } catch {
        setPermissionGranted(true);
      }
    };
    autoRequest();
  }, []);

  // --- 2. CAMERA INITIALIZATION ---
  useEffect(() => {
    if (!permissionGranted) return;

    let stream: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async () => {
      // Small delay to prevent React StrictMode double-start
      await new Promise(r => setTimeout(r, 300));
      if (!isMounted) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', focusMode: 'continuous' } as any,
          audio: false
        });
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          setIsInitialized(true);
          setStatus('SEARCHING');
        }
      } catch (err) {
        if (isMounted) onFailRef.current('Camera access failed: ' + err);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [permissionGranted]); // Removed onFail from dependencies to stop blinking

  // --- 3. THREE.JS SCENE SETUP ---
  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '5'; // Above video (1), below HUD (10)
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2ff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // --- 3.5 GENERATE QR TEXTURE FROM CANVAS ---
    let qrTexture: THREE.Texture;
    if (qrCanvasRef.current) {
      qrTexture = new THREE.CanvasTexture(qrCanvasRef.current);
      qrTexture.magFilter = THREE.NearestFilter;
      qrTexture.minFilter = THREE.NearestFilter;
      textureRef.current = qrTexture;
    } else {
      // Fallback
      qrTexture = new THREE.TextureLoader().load('/markers/location_qr.png');
    }

    // THE FLOATING QR DATA PLATE (TARGET)
    const geometry = new THREE.PlaneGeometry(3, 3);

    const material = new THREE.MeshBasicMaterial({
      map: qrTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const targetGroup = new THREE.Group();
    scene.add(targetGroup);

    const totalTargets = 3;
    const targets: THREE.Mesh[] = [];
    for (let i = 0; i < totalTargets; i++) {
      const qrPlate = new THREE.Mesh(geometry, material.clone());

      // --- SPATIAL RANDOMIZATION & DECOYS ---
      // Spread them across 360 degrees (120deg apart)
      const angle = ((round * 45) + (i * 120)) * (Math.PI / 180);
      const pitch = ((-10) + (i * 20)) * (Math.PI / 180);
      const distance = 5;

      const x = Math.sin(angle) * Math.cos(pitch) * distance;
      const y = Math.sin(pitch) * distance;
      const z = -Math.cos(angle) * Math.cos(pitch) * distance;

      qrPlate.position.set(x, y, z);
      qrPlate.scale.set(0.8, 0.8, 0.8);
      qrPlate.userData = { isReal: i === 0 }; // First one is real, others decoys

      // Add a glowing frame to each
      const frameGeom = new THREE.PlaneGeometry(3.2, 3.2);
      const frameMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const frame = new THREE.Mesh(frameGeom, frameMat);
      frame.position.z = -0.01;
      qrPlate.add(frame);

      targetGroup.add(qrPlate);
      targets.push(qrPlate);
    }

    cubeRef.current = targetGroup as any; // Store the group for tracking

    // --- 3.6 AUTO-UPDATE TEXTURE ON DATA CHANGE ---
    const updateTexture = () => {
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    };

    // Listen for changes and force update
    const intervalId = setInterval(updateTexture, 1000); // Check once per second to be safe



    // --- GYRO ORIENTATION LOGIC (Quaternion Based) ---
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!cameraRef.current) return;

      if (initialOffset.current === null && e.alpha !== null) {
        initialOffset.current = e.alpha;
      }

      const alpha = e.alpha ? THREE.MathUtils.degToRad(e.alpha - (initialOffset.current || 0)) : 0;
      const beta = e.beta ? THREE.MathUtils.degToRad(e.beta) : 0;
      const gamma = e.gamma ? THREE.MathUtils.degToRad(e.gamma) : 0;

      const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
      targetQuaternion.current.setFromEuler(euler);
    };

    window.addEventListener('deviceorientation', handleOrientation);

    // --- ANIMATION LOOP ---
    const animate = () => {
      // 1. Update Camera Rotation
      if (cameraRef.current) {
        cameraRef.current.quaternion.copy(targetQuaternion.current);
      }

      // 2. Update Target Face & Pulse
      if (cubeRef.current) {
        const group = cubeRef.current as THREE.Group;
        group.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            // Look at the camera but stay upright
            const lookPos = new THREE.Vector3();
            cameraRef.current?.getWorldPosition(lookPos);
            child.up.set(0, 1, 0); // Keep it upright
            child.lookAt(lookPos);

            // Pulse the frame brightness
            if (child.children[0]) {
              (child.children[0] as any).material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
            }
          }
        });
      }

      // --- 4. GAZE-BASED AUTO-SCANNING ---
      // ONLY ALLOW SCANNING IF WITHIN 10m (unless bypass is on)
      const currentDist = distanceRef.current;
      const canScan = testingBypassEnabled || currentDist === null || currentDist <= 10;
      
      if (cameraRef.current && cubeRef.current && statusRef.current === 'SEARCHING' && canScan) {
        const group = cubeRef.current as THREE.Group;

        // Sample a slightly wider cross pattern for even more forgiving detection
        const samplePoints = [
          new THREE.Vector2(0, 0),       // center
          new THREE.Vector2(0.08, 0),    // right
          new THREE.Vector2(-0.08, 0),   // left
          new THREE.Vector2(0, 0.08),    // up
          new THREE.Vector2(0, -0.08),   // down
          new THREE.Vector2(0.05, 0.05), // top-right
          new THREE.Vector2(-0.05, -0.05)// bottom-left
        ];

        let hitReal = false;
        let hitDecoy = false;

        for (const point of samplePoints) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(point, cameraRef.current);
          const intersects = raycaster.intersectObjects(group.children);
          if (intersects.length > 0) {
            if (intersects[0].object.userData.isReal) { hitReal = true; break; }
            else { hitDecoy = true; }
          }
        }

        if (hitReal) {
          // ON TARGET — fill faster for better feel
          let completed = false;
          setScanProgress(prev => {
            const next = prev + 4.0; // Slightly faster (~25 frames)
            if (next >= 100) {
              completed = true;
              return 100;
            }
            return next;
          });

          if (completed) {
            setStatus('LOCKED');
            onCaptureRef.current(targetDataRef.current || '');
          }
        } else if (hitDecoy) {
          setScanProgress(prev => Math.max(0, prev - 3));
          setStatus('DECOY');
          setTimeout(() => setStatus('SEARCHING'), 800);
        } else {
          // Off target — drain slowly
          setScanProgress(prev => Math.max(0, prev - 1.2));
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(requestRef.current);
      if (intervalId) clearInterval(intervalId);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [isInitialized, round]);

  // --- 4. INTERACTION ---
  const handleTouch = (event: React.MouseEvent | React.TouchEvent) => {
    if (!rendererRef.current || !cameraRef.current || !cubeRef.current) return;

    // Get the exact dimensions of the canvas
    const rect = rendererRef.current.domElement.getBoundingClientRect();

    // Get touch/mouse coordinates relative to the canvas
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as React.MouseEvent).clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as React.MouseEvent).clientY;

    const mouse = new THREE.Vector2();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const group = cubeRef.current as THREE.Group;
    const intersects = raycaster.intersectObjects(group.children);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData.isReal) {
        // SUCCESS!
        setStatus('LOCKED');
        if (hit instanceof THREE.Mesh && hit.material instanceof THREE.MeshBasicMaterial) {
          hit.material.color.setHex(0xffffff);
        }
        setTimeout(() => {
          onCapture(targetData || '');
        }, 500);
      } else {
        setStatus('DECOY' as any);
        setTimeout(() => setStatus('SEARCHING'), 1000);
      }
    }
  };

  // Show a minimal loading screen while auto-permission is resolving (should be instant on Android/desktop)
  if (!permissionGranted && !needsManualPermission) {
    return createPortal(
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-[99999]" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
        <div className="w-12 h-12 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#00f2ff]/60 font-mono text-xs uppercase tracking-[0.2em]">Initializing...</p>
      </div>,
      document.body
    );
  }

  // iOS only: requires a user gesture to unlock DeviceOrientationEvent
  if (needsManualPermission && !permissionGranted) {
    return createPortal(
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-[99999] p-6 text-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
        <div className="w-20 h-20 border-2 border-[#00f2ff] rounded-full flex items-center justify-center mb-6 animate-pulse">
          <div className="w-12 h-12 border border-[#00f2ff] rounded-full" />
        </div>
        <h2 className="text-[#00f2ff] font-mono text-xl mb-4 tracking-tighter">SENSORS OFFLINE</h2>
        <p className="text-gray-400 font-mono text-sm mb-8 leading-relaxed">
          TAP THE BUTTON BELOW TO CALIBRATE YOUR COMPASS AND GYROSCOPE.
          STAY STILL DURING INITIALIZATION.
        </p>
        <button
          onClick={requestSensorPermission}
          className="px-8 py-4 bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] font-mono uppercase tracking-[0.2em] hover:bg-[#00f2ff]/20 transition-all active:scale-95 pointer-events-auto"
        >
          Initialize Link
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black overflow-hidden z-[99999]"
      ref={containerRef}
      onMouseDown={handleTouch}
      onTouchStart={handleTouch}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}
    >
      {/* 1. CAMERA FEED (BACKGROUND) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 2. TACTICAL HUD (OVERLAY) */}
      <div className="absolute inset-0 pointer-events-none z-[10]" style={{ zIndex: 10 }}>
        {/* Tactical Crosshair (HIDDEN - Using Square Brackets instead) */}

        {/* Decorative HUD Elements (HIDDEN) */}

        {/* Corners */}
        <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-red-500" />
        <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-red-500" />
        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-red-500" />
        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-red-500" />

        {testingBypassEnabled && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1 animate-pulse z-50">
            TESTING BYPASS ACTIVE
          </div>
        )}

        {/* Directional Guide (Arrow) */}
        {status === 'SEARCHING' && !testingBypassEnabled && distance !== null && distance > 10 && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-8 text-center">
            <div className="p-4 bg-red-500/20 rounded-full mb-6 border border-red-500/50">
              <Lock className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-4 tracking-tighter">OUT OF PROXIMITY</h2>
            <p className="text-white/60 font-mono text-sm uppercase leading-relaxed max-w-xs">
              YOU MUST BE WITHIN 10m OF THE TARGET TO SCAN. <br />
              CURRENT DISTANCE: <span className="text-red-400 font-bold">{Math.round(distance)}m</span>
            </p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 animate-pulse w-full" />
            </div>
          </div>
        )}

        {status === 'SEARCHING' && (testingBypassEnabled || distance === null || distance <= 10) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex flex-col items-center justify-center pointer-events-none">

            {/* Targeting Reticle — always visible */}
            <div className={`relative flex items-center justify-center transition-all duration-300 ${scanProgress > 0 ? 'scale-90' : 'scale-100'}`}>
              {/* Corner Brackets — turn accent when scanning */}
              <div className={`absolute -top-14 -left-14 w-6 h-6 border-t-2 border-l-2 transition-all duration-300 ${scanProgress > 0 ? 'border-[#00f2ff] translate-x-2 translate-y-2' : 'border-red-500'}`} />
              <div className={`absolute -top-14 -right-14 w-6 h-6 border-t-2 border-r-2 transition-all duration-300 ${scanProgress > 0 ? 'border-[#00f2ff] -translate-x-2 translate-y-2' : 'border-red-500'}`} />
              <div className={`absolute -bottom-14 -left-14 w-6 h-6 border-b-2 border-l-2 transition-all duration-300 ${scanProgress > 0 ? 'border-[#00f2ff] translate-x-2 -translate-y-2' : 'border-red-500'}`} />
              <div className={`absolute -bottom-14 -right-14 w-6 h-6 border-b-2 border-r-2 transition-all duration-300 ${scanProgress > 0 ? 'border-[#00f2ff] -translate-x-2 -translate-y-2' : 'border-red-500'}`} />
              {/* Center dot */}
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${scanProgress > 0 ? 'bg-[#00f2ff] shadow-[0_0_8px_#00f2ff]' : 'bg-red-500/60'}`} />
            </div>

            {/* Scan Progress Bar — always shown, reflects 0–100% */}
            <div className="absolute bottom-[28%] flex flex-col items-center gap-2 w-56">
              {scanProgress > 0 ? (
                <div className="flex items-center gap-2 text-[#00f2ff] font-mono text-xs uppercase tracking-[0.2em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-ping" />
                  SCANNING... {Math.round(scanProgress)}%
                </div>
              ) : (
                <div className="text-white/40 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
                  AIM AT TARGET QR
                </div>
              )}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-75 ease-linear ${scanProgress > 0 ? 'bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]' : 'bg-white/20'}`}
                  style={{ width: `${Math.max(2, scanProgress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status Text (MINIMAL) */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center w-full px-4">
          <div className="text-xl text-red-500 font-mono font-bold tracking-widest uppercase">
            {status === 'LOCKED' && (
              <span className="text-white bg-red-600 px-4 py-1 shadow-[0_0_15px_#ff4444] animate-pulse">CORE LOCKED</span>
            )}
            {(status as string) === 'DECOY' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-white bg-red-800 px-4 py-1 shadow-[0_0_20px_#ff0000] animate-bounce">
                  [ DECOY DETECTED ]
                </span>
                <span className="text-[10px] tracking-[0.3em] text-red-400">SIGNAL INTERFERENCE DETECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* Legacy Crosshair Removed */}
      </div>

      {/* 3. HIDDEN QR GENERATOR CANVAS */}
      <div style={{ display: 'none' }}>
        <QRCodeCanvas
          value={targetData}
          size={512}
          level="H"
          includeMargin={true}
          ref={qrCanvasRef}
        />
      </div>

      {/* 4. THREE.JS RENDERING CANVAS (WILL BE INJECTED HERE) */}
      {/* The renderer.domElement will have zIndex 5 automatically via JS initialization if we want, but let's just let it sit in the container */}
      <style>{`
        canvas {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 5;
          pointer-events: auto;
        }
      `}</style>
    </div>,
    document.body
  );
};
