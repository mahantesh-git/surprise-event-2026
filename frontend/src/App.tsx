import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Activity,
  CheckCircle2,
  MapPin,
  QrCode,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  ShieldAlert,
  Copy,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { GridBackground } from '@/components/GridBackground';
import { AdminPanel } from '@/components/AdminPanel';
import { RoleSelection } from '@/components/RoleSelection';
import { useGameState, Role } from '@/hooks/useGameState';
import { useRunnerGps } from '@/hooks/useRunnerGps';
import { useSocket } from '@/contexts/SocketContext';
import { getQuestions, compileCode, getFinalRoundQrCode, verifyRunnerFinalQr, RoundQuestion, requestTacticalSupport } from '@/lib/api';
import type { SupportedLanguage } from '@/components/CodeEditor';
import { CodeEditor, LANGUAGE_TEMPLATES } from '@/components/CodeEditor';
import { PersistentProgress } from '@/components/PersistentProgress';
import { SectorMap } from '@/components/SectorMap';
import { RunnerGame } from '@/components/RunnerGame';
import { Leaderboard } from '@/components/Leaderboard';
import { QRScanner } from '@/components/QRScanner';
import { TacticalComms } from '@/components/TacticalComms';
import { LoginScreen } from '@/components/LoginScreen';
import { TacticalBackground } from '@/components/TacticalBackground';
import { TacticalStatus } from '@/components/TacticalStatus';
import { QRCodeSVG } from 'qrcode.react';
const SOLVER_FULLSCREEN_EXIT_KEY = import.meta.env.VITE_SOLVER_EXIT_KEY || 'quest-exit';

const TacticalProgressBar = ({ stage }: { stage: string }) => {
  console.log('[TacticalProgress] Rendering for stage:', stage);
  const steps = [
    { id: 1, label: 'Deployment', desc: 'Passkey Authentication', icon: QrCode },
    { id: 2, label: 'Insertion', desc: 'Infiltration / Scanning', icon: MapPin },
    { id: 3, label: 'Extraction', desc: 'Data Puzzle Solving', icon: Activity },
    { id: 4, label: 'Handoff', desc: 'Secure Handshake', icon: Shield },
  ];

  const getStatus = (stepId: number) => {
    const s = stage as string;
    if (stepId === 1) {
      if (['p1_solve', 'p1_solved'].includes(s)) return 'pending';
      if (s === 'runner_travel') return 'active';
      return 'completed';
    }
    if (stepId === 2) {
      if (['p1_solve', 'p1_solved', 'runner_travel'].includes(s)) return 'pending';
      if (s === 'runner_game') return 'active';
      return 'completed';
    }
    if (stepId === 3) {
      if (['p1_solve', 'p1_solved', 'runner_travel', 'runner_game'].includes(s)) return 'pending';
      if (s === 'runner_game') return 'active';
      return 'completed';
    }
    if (stepId === 4) {
      if (s === 'runner_done') return 'active';
      if (['final_qr', 'complete'].includes(s)) return 'completed';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="w-full py-10 space-y-8 bg-black/20 border-y border-white/5 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-20" />
      
      <div className="flex justify-between items-start relative px-6 md:px-12 max-w-4xl mx-auto">
        {/* Connecting Line */}
        <div className="absolute top-6 left-12 right-12 h-[1px] bg-white/10 -z-0" />
        
        {steps.map((step, idx) => {
          const status = getStatus(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group flex-1">
              {/* Point Indicator */}
              <div className={cn(
                "w-12 h-12 flex items-center justify-center transition-all duration-700",
                "clip-oct border",
                status === 'completed' ? "bg-[var(--color-accent)] border-[var(--color-accent)] shadow-[0_0_25px_var(--color-accent)]" :
                status === 'active' ? "bg-black border-[var(--color-accent)] animate-pulse shadow-[0_0_15px_rgba(217,31,64,0.3)]" :
                "bg-black/40 border-white/20"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  status === 'completed' ? "text-white" :
                  status === 'active' ? "text-[var(--color-accent)]" :
                  "text-white/30"
                )} />
              </div>
              
              {/* Label */}
              <div className="mt-4 text-center">
                <span className={cn(
                  "block font-heading text-[10px] tracking-[0.2em] uppercase font-bold whitespace-nowrap",
                  status === 'completed' ? "text-white" :
                  status === 'active' ? "text-[var(--color-accent)]" :
                  "text-white/30"
                )}>{step.label}</span>
                <span className="block font-mono text-[8px] opacity-40 uppercase mt-1 hidden lg:block">{step.desc}</span>
              </div>

              {/* Progress Line Filler */}
              {idx < steps.length - 1 && (
                <div className={cn(
                  "absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-[1px] -z-10",
                  status === 'completed' ? "bg-[var(--color-accent)]" : "bg-white/5"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const normalizedPathname = pathname.replace(/\/$/, '');
  const role = normalizedPathname === '/solver' || normalizedPathname === '/runner' ? (normalizedPathname.slice(1) as Role) : null;
  const { session, gameState, score, loading, login, logout, resetGame, updateState, sync } = useGameState((role ?? 'solver') as Role);
  const [rounds, setRounds] = useState<RoundQuestion[]>(() => {
    try {
      const stored = localStorage.getItem('quest_rounds');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse cached rounds');
    }
    return [];
  });
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const [p1Code, setP1Code] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncingRunner, setIsSyncingRunner] = useState(false);
  const [isEnteringRunnerGame, setIsEnteringRunnerGame] = useState(false);
  const [finalQrPayload, setFinalQrPayload] = useState<string>('');
  const [finalQrLoading, setFinalQrLoading] = useState(false);
  const [finalQrError, setFinalQrError] = useState<string | null>(null);
  const [finalQrScannerOpen, setFinalQrScannerOpen] = useState(false);
  const [isVerifyingFinalQr, setIsVerifyingFinalQr] = useState(false);
  const [runnerTab, setRunnerTab] = useState<'intel' | 'map'>('intel');
  const [consoleOutput, setConsoleOutput] = useState<{
    stdout: string;
    stderr: string;
    matched: boolean;
    testResults?: Array<{ input: string; passed: boolean; stdout: string; stderr: string }>
  } | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; tone: 'info' | 'success'; label?: string }>>([]);
  const [showFullscreenExitGate, setShowFullscreenExitGate] = useState(false);
  const [fullscreenExitKeyInput, setFullscreenExitKeyInput] = useState('');
  const [fullscreenExitError, setFullscreenExitError] = useState<string | null>(null);
  const [reenteringFullscreen, setReenteringFullscreen] = useState(false);
  const [isCommsOpen, setIsCommsOpen] = useState(false);

  const [devMode, setDevMode] = useState(false);
  const previousRoundStateRef = useRef<number | null>(null);
  const lastRunnerHandoffNoticeRef = useRef<string>('');
  const lastSolverCompleteNoticeRef = useRef(false);
  const notificationTimerRef = useRef<number | null>(null);
  const isVerifyingFinalQrRef = useRef(false);
  const lastFinalQrNoticeRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  const lastMessageNoticeRef = useRef<number>(0);
  const solverExitAuthorizedRef = useRef(false);

  const requestAppFullscreen = async () => {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const request = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
    if (!request) return false;

    try {
      await Promise.resolve(request());
      return true;
    } catch {
      return false;
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      if (typeof (window as any).DeviceOrientationEvent !== 'undefined' && typeof (window as any).DeviceOrientationEvent.requestPermission === 'function') {
        try {
          await (window as any).DeviceOrientationEvent.requestPermission();
        } catch (e) {
          console.warn('DeviceOrientation permission request failed or ignored', e);
        }
      }

      await login(teamName, password);
      if (role === 'solver' || role === 'runner') {
        await requestAppFullscreen();
        wasFullscreenRef.current = !!document.fullscreenElement;
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logout();
    setPassword('');
    setLoginError(null);
  };

  useRunnerGps(session?.token ?? null, gameState?.stage ?? null);

  const { connect: socketConnect, disconnect: socketDisconnect } = useSocket();
  useEffect(() => {
    if (pathname === '/admin') return;
    if (session?.token) {
      socketConnect(session.token);
    } else {
      socketDisconnect();
    }
  }, [session?.token, pathname, socketConnect, socketDisconnect]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [helpCooldown, setHelpCooldown] = useState(0);
  const helpCooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isRequestingHelp, setIsRequestingHelp] = useState(false);

  useEffect(() => {
    if (helpCooldown > 0) {
      helpCooldownTimerRef.current = setInterval(() => {
        setHelpCooldown(prev => prev - 1);
      }, 1000);
    } else if (helpCooldown === 0 && helpCooldownTimerRef.current) {
      clearInterval(helpCooldownTimerRef.current);
    }
    return () => {
      if (helpCooldownTimerRef.current) clearInterval(helpCooldownTimerRef.current);
    };
  }, [helpCooldown]);

  const handleRequestHelp = async () => {
    if (helpCooldown > 0 || isRequestingHelp || !session) return;
    setIsRequestingHelp(true);
    let coords: { lat: number; lng: number } | undefined;
    if (role === 'runner' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });
        });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (err) {
        console.warn('High-accuracy GPS failed, trying fallback...', err);
      }
    }
    try {
      await requestTacticalSupport(session.token, coords);
      pushNotification('Tactical Support requested. Mission Control has been notified.', 'success');
      setHelpCooldown(60);
    } catch (err) {
      pushNotification('Failed to reach Mission Control. Check your signal.', 'info');
    } finally {
      setIsRequestingHelp(false);
    }
  };

  useEffect(() => {
    if (!role) return;
    setRoundsLoading(true);
    getQuestions()
      .then((response: any) => {
        const questionsArray = response?.questions || (Array.isArray(response) ? response : []);
        const sorted = [...questionsArray].sort((a: RoundQuestion, b: RoundQuestion) => (a.round || 0) - (b.round || 0));
        setRounds(sorted);
        try {
          localStorage.setItem('quest_rounds', JSON.stringify(sorted));
        } catch (e) {
          console.warn('Failed to cache rounds');
        }
        setRoundsError(null);
      })
      .catch((error: Error) => {
        if (rounds.length === 0) {
          setRoundsError(error instanceof Error ? error.message : 'Failed to load questions');
        }
      })
      .finally(() => setRoundsLoading(false));
  }, [role, session?.team.id]);

  const previousRoundRef = useRef(gameState?.round);
  useEffect(() => {
    if (gameState && gameState.round !== previousRoundRef.current) {
      if (gameState.stage === 'p1_solve') {
        const round = rounds[Math.min(gameState.round, rounds.length - 1)];
        if (round) {
          const defaultLang = (round.p1.language ?? 'python') as SupportedLanguage;
          setSelectedLanguage(defaultLang);
          setP1Code(LANGUAGE_TEMPLATES[defaultLang]);
          setConsoleOutput(null);
        }
      }
      previousRoundRef.current = gameState.round;
    }
  }, [gameState?.round, gameState?.stage, rounds]);

  useEffect(() => {
    if (!session?.token || !gameState || gameState.stage !== 'final_qr') {
      setFinalQrPayload('');
      return;
    }
    if (role === 'solver') {
      setFinalQrLoading(true);
      getFinalRoundQrCode(session.token)
        .then((result) => setFinalQrPayload(result.qrCode))
        .catch((error) => setFinalQrError(error instanceof Error ? error.message : 'Failed to load final QR'))
        .finally(() => setFinalQrLoading(false));
    }
  }, [gameState?.stage, role, session?.token]);

  const pushNotification = (message: string, tone: 'info' | 'success' = 'info', label: string = 'System') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, tone, label }]);
    window.setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4500);
  };

  useEffect(() => {
    if (!gameState || !session || !role) return;
    const prevRound = previousRoundStateRef.current;
    const handoffKey = `${gameState.round}:${gameState.handoff?.passkey ?? ''}`;

    if (role === 'runner' && gameState.stage === 'runner_travel' && gameState.handoff?.passkey && lastRunnerHandoffNoticeRef.current !== handoffKey) {
      pushNotification(`Solver synchronized round ${gameState.round + 1}. Travel to coordinates.`);
      lastRunnerHandoffNoticeRef.current = handoffKey;
    }

    if (role === 'solver' && prevRound !== null && gameState.round > prevRound && gameState.stage === 'p1_solve') {
      pushNotification(`Runner finished round ${prevRound + 1}. Round ${gameState.round + 1} is unlocked.`, 'success');
    }

    if (role === 'solver' && gameState.stage === 'complete' && !lastSolverCompleteNoticeRef.current) {
      pushNotification('Quest completed.', 'success');
      lastSolverCompleteNoticeRef.current = true;
    }

    if (gameState.lastMessage && gameState.lastMessage.timestamp > lastMessageNoticeRef.current) {
      if (gameState.lastMessage.senderRole !== session.role) {
        let formattedMessage = '';
        if (gameState.lastMessage.senderRole === 'admin') {
          formattedMessage = `admin : ${gameState.lastMessage.text}`;
        } else {
          const teamName = session.team?.name || 'TEAM';
          const roleStr = gameState.lastMessage.senderRole.toLowerCase();
          formattedMessage = `${teamName} [${roleStr}] : ${gameState.lastMessage.text}`;
        }
        pushNotification(formattedMessage, 'info', 'INCOMING TRANSMISSION');
      }
      lastMessageNoticeRef.current = gameState.lastMessage.timestamp;
    }

    previousRoundStateRef.current = gameState.round;
  }, [gameState, role, session]);

  useEffect(() => {
    if (!session || (role !== 'solver' && role !== 'runner')) return;
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      if (!isFullscreen && wasFullscreenRef.current && !solverExitAuthorizedRef.current) {
        setShowFullscreenExitGate(true);
      }
      wasFullscreenRef.current = isFullscreen;
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [session, role]);

  const handleAllowFullscreenExit = async () => {
    if (fullscreenExitKeyInput.trim() !== SOLVER_FULLSCREEN_EXIT_KEY) {
      setFullscreenExitError('Invalid exit key');
      return;
    }
    setShowFullscreenExitGate(false);
    solverExitAuthorizedRef.current = true;
    if (document.fullscreenElement) await document.exitFullscreen();
  };

  const handleReturnToFullscreen = async () => {
    const ok = await requestAppFullscreen();
    if (ok) setShowFullscreenExitGate(false);
  };

  const runCode = async (codeOverride?: string) => {
    const codeToRun = typeof codeOverride === 'string' ? codeOverride : p1Code;
    if (!session?.token || !codeToRun.trim() || isRunning) return;
    setIsRunning(true);
    try {
      const result = await compileCode(session.token, currentRound.id, codeToRun, selectedLanguage);
      const allPassed = result.testResults?.every(r => r.passed) ?? false;
      setConsoleOutput({
        stdout: result.testResults?.[result.testResults.length - 1]?.stdout || '',
        stderr: result.testResults?.[result.testResults.length - 1]?.stderr || '',
        matched: allPassed,
        testResults: result.testResults
      });
      if (allPassed) {
        setTimeout(() => updateState({ stage: 'p1_solved' }), 1500);
      }
    } catch (error) {
      setConsoleOutput({ stdout: '', stderr: 'Execution failed', matched: false });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSyncRunnerNode = async () => {
    if (isSyncingRunner) return;
    setIsSyncingRunner(true);
    try {
      await updateState({
        stage: 'runner_travel',
        handoff: {
          passkey: currentRound.qrPasskey,
          lat: currentRound.coord.lat,
          lng: currentRound.coord.lng,
          volunteer: currentRound.volunteer.name,
          place: currentRound.coord.place,
        },
      });
      setRunnerTab('map');
    } finally {
      setIsSyncingRunner(false);
    }
  };



  const handleVerifyFinalQr = async (decodedValue: string) => {
    if (!session?.token || isVerifyingFinalQrRef.current) return;
    isVerifyingFinalQrRef.current = true;
    setIsVerifyingFinalQr(true);
    try {
      await verifyRunnerFinalQr(session.token, decodedValue.trim());
      setFinalQrScannerOpen(false);
      await sync();
    } catch (error) {
      pushNotification('Verification failed', 'info');
    } finally {
      isVerifyingFinalQrRef.current = false;
      setIsVerifyingFinalQr(false);
    }
  };

  if (pathname === '/admin') {
    return (
      <>
        <TacticalBackground />
        <AdminPanel
          onBack={() => {
            window.history.pushState({}, '', '/');
            setPathname('/');
          }}
        />
      </>
    );
  }

  if (!session || !role) {
    return (
      <>
        <TacticalBackground />
        <AnimatePresence mode="wait">
          {!role ? (
            <RoleSelection key="role" onSelect={(r) => { window.history.pushState({}, '', `/${r}`); setPathname(`/${r}`); }} />
          ) : (
            <LoginScreen
              key="login"
              role={role}
              teamName={teamName}
              password={password}
              onTeamNameChange={setTeamName}
              onPasswordChange={setPassword}
              onLogin={handleLogin}
              isLoggingIn={isLoggingIn}
              loginError={loginError}
              onAdminClick={() => { window.history.pushState({}, '', '/admin'); setPathname('/admin'); }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (loading || roundsLoading || !gameState) return null;

  if (roundsError || !rounds.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-widest text-red-500">System Error</h2>
          <p className="text-sm opacity-60">{roundsError || 'No mission rounds configured.'}</p>
          <Button onClick={() => window.location.reload()}>Retry Sync</Button>
        </div>
      </div>
    );
  }

  const currentRound = rounds[Math.min(gameState.round, rounds.length - 1)];
  const isMyTurn = (role === 'solver' && ['p1_solve', 'p1_solved'].includes(gameState.stage)) ||
    (role === 'runner' && ['runner_travel', 'runner_entry', 'runner_game', 'runner_done'].includes(gameState.stage)) ||
    gameState.stage === 'final_qr';

  return (
    <>
      <TacticalBackground />
      <AnimatePresence>
        {showFullscreenExitGate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="max-w-sm w-full space-y-6 text-center">
              <h2 className="text-[var(--color-accent)] text-xl font-bold uppercase tracking-widest">Exit Fullscreen?</h2>
              <input
                type="password"
                value={fullscreenExitKeyInput}
                onChange={(e) => setFullscreenExitKeyInput(e.target.value)}
                placeholder="SECURITY_KEY"
                className="w-full bg-white/5 border border-white/10 p-4 text-center font-mono"
              />
              {fullscreenExitError && <p className="text-red-500 text-xs">{fullscreenExitError}</p>}
              <div className="flex gap-4">
                <Button className="flex-1" onClick={handleReturnToFullscreen}>Stay</Button>
                <Button className="flex-1" variant="primary" onClick={handleAllowFullscreenExit}>Exit</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] w-max max-w-[90vw] flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
              <TacticalStatus tone={n.tone} label={n.label} message={n.message} icon={n.tone === 'success' ? CheckCircle : Activity} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <PersistentProgress totalRounds={rounds.length} currentRound={gameState?.round ?? 0} roundsDone={gameState?.roundsDone ?? []} />
      <Navbar
        brandName={`QUEST : ${session?.team?.name || 'TEAM'}`}
        ctaText="SYSTEM"
        metaText={role.toUpperCase()}
        startTime={gameState?.startTime}
        finishTime={gameState?.finishTime}
      />

      <div className="min-h-screen pt-24 pb-32 px-6 relative z-10 flex flex-col">
        {/* OPERATIONAL TABS */}
        {gameState && ['p1_solved', 'runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr'].includes(gameState.stage) && gameState.stage !== 'complete' && (
          <div className="mb-8 flex gap-1 h-14">
            <button
              onClick={() => setRunnerTab('intel')}
              className={cn(
                "flex-1 flex items-center justify-center gap-4 transition-all duration-700 font-black uppercase tracking-[0.5em] text-[11px] relative overflow-hidden group",
                runnerTab === 'intel' 
                  ? "bg-white text-black" 
                  : "bg-black/90 text-white/20 hover:text-white/50 border border-white/5"
              )}
              style={{ clipPath: 'polygon(0 0, 98% 0, 100% 100%, 0 100%)' }}
            >
              {runnerTab === 'intel' && (
                <>
                  <motion.div layoutId="tab-active-bg" className="absolute inset-0 bg-white" />
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '300%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-black/[0.05] to-transparent z-10"
                  />
                  <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]" />
                </>
              )}
              <Activity className={cn("w-4 h-4 z-20", runnerTab === 'intel' ? "text-black" : "text-red-600/40 group-hover:text-red-500/60")} />
              <span className="z-20">Tactical Intel</span>
            </button>
            <button
              onClick={() => setRunnerTab('map')}
              className={cn(
                "flex-1 flex items-center justify-center gap-4 transition-all duration-700 font-black uppercase tracking-[0.5em] text-[11px] relative overflow-hidden group",
                runnerTab === 'map' 
                  ? "bg-white text-black" 
                  : "bg-black/90 text-white/20 hover:text-white/50 border border-white/5"
              )}
              style={{ clipPath: 'polygon(2% 0, 100% 0, 100% 100%, 0 100%)' }}
            >
              {runnerTab === 'map' && (
                <>
                  <motion.div layoutId="tab-active-bg" className="absolute inset-0 bg-white" />
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '300%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-black/[0.05] to-transparent z-10"
                  />
                  <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]" />
                </>
              )}
              <MapPin className={cn("w-4 h-4 z-20", runnerTab === 'map' ? "text-black" : "text-red-600/40 group-hover:text-red-500/60")} />
              <span className="z-20">Sector Map</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-white/10 pb-4 mb-6 flex justify-between items-end">
          <div>
            <span className="label-technical text-[var(--color-accent)] mb-1 block">Operational Telemetry</span>
            <h1 className="text-3xl font-bold uppercase tracking-tighter">Round <span className="text-[var(--color-accent)]">0{gameState.round + 1}</span></h1>
          </div>
          <Badge variant="outline" className="uppercase tracking-widest px-3 py-1 border-[var(--color-accent)]/40 text-[var(--color-accent)]">{role}</Badge>
        </div>

        {/* Global Progress for Solver */}
        {role === 'solver' && ['runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr'].includes(gameState.stage) && (
          <div className="mb-8 px-2">
            <TacticalProgressBar stage={gameState.stage} />
          </div>
        )}

        {/* Content */}
        {!isMyTurn && gameState.stage !== 'complete' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="flex-1 flex flex-col p-4"
          >
            {runnerTab === 'map' && (role === 'solver' ? ['p1_solved', 'runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr'] : ['runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr']).includes(gameState.stage) ? (
              <div className="flex-1 min-h-[500px] w-full">
                      <SectorMap rounds={rounds} currentRound={gameState.round} roundsDone={gameState.roundsDone} stage={gameState.stage} visible={true} role={role} runnerName={session?.team?.runnerName} />
              </div>
            ) : (
              <div className="max-w-3xl w-full text-center space-y-12 relative mx-auto my-auto">
                {/* Decorative top element */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent to-[var(--color-accent)] opacity-50" />
                
                <div className="space-y-4">
                  <div className="flex justify-center mb-8">
                    <div className="relative flex items-center justify-center w-24 h-24">
                      <div className="absolute inset-0 border border-[var(--color-accent)]/20 animate-[spin_4s_linear_infinite]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                      <div className="absolute inset-2 border border-[var(--color-accent)]/40 animate-[spin_3s_linear_infinite_reverse]" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                      <Activity className="w-8 h-8 text-[var(--color-accent)] animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black tracking-[0.3em] text-[var(--color-accent)] uppercase" style={{ textShadow: '0 0 30px rgba(217,31,64,0.4)' }}>
                    Awaiting Operative
                  </h2>
                  <div className="flex items-center justify-center gap-3 text-white/40">
                    <span className="w-8 h-px bg-white/20" />
                    <p className="text-[10px] font-mono tracking-widest uppercase">Synchronizing with Node 0{gameState.round + 1}</p>
                    <span className="w-8 h-px bg-white/20" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {gameState.stage === 'p1_solve' && (
                <motion.div key="p1_solve" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  <div className="corner-card glass-morphism p-8 space-y-6">
                    <div>
                      <span className="label-technical text-[var(--color-accent)]">Mission Objective</span>
                      <h2 className="text-xl font-bold uppercase mt-2">{currentRound.p1.title}</h2>
                    </div>
                    <div className="p-5 glass-morphism-inner bg-black/40 rounded-lg max-h-[400px] overflow-y-auto custom-scrollbar">
                      <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-white/90">{currentRound.p1.hint}</p>
                    </div>
                  </div>
                  <div className="space-y-4 flex flex-col">
                    <CodeEditor
                      value={p1Code || LANGUAGE_TEMPLATES[selectedLanguage]}
                      onChange={setP1Code}
                      language={selectedLanguage}
                      onLanguageChange={(l, s) => { setSelectedLanguage(l); setP1Code(s); }}
                      onRun={() => runCode()}
                      height="400px"
                    />
                    <Button 
                      className="w-full h-14 bg-transparent border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors font-bold uppercase tracking-[0.2em]" 
                      style={{ clipPath: 'var(--clip-oct)' }}
                      onClick={() => runCode()} 
                      disabled={isRunning}
                    >
                      {isRunning ? 'EXECUTING...' : '▶ RUN CODE'}
                    </Button>
                    
                    <div className="corner-card glass-morphism-dark p-6 flex-1 min-h-[160px] font-mono text-[11px] overflow-y-auto flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] mb-4 block font-bold">Execution Console</span>
                      {!consoleOutput && !isRunning && (
                        <div className="text-white/40 flex items-center gap-2">
                          <span className="bg-white/40 w-1.5 h-3 block animate-pulse"></span>
                          AWAITING EXECUTION...
                        </div>
                      )}
                      {isRunning && (
                        <div className="text-[var(--color-accent)] flex items-center gap-2">
                          <span className="bg-[var(--color-accent)] w-1.5 h-3 block animate-pulse"></span>
                          PROCESSING...
                        </div>
                      )}
                      {consoleOutput && (
                        <div className="space-y-2 flex-1">
                          {consoleOutput.stderr && <pre className="text-red-400 whitespace-pre-wrap">{consoleOutput.stderr}</pre>}
                          {consoleOutput.stdout && <pre className="text-white/80 whitespace-pre-wrap">{consoleOutput.stdout}</pre>}
                          {consoleOutput.matched && <p className="text-[var(--color-accent)] font-bold mt-4">Protocol Verified. Solution accepted.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {gameState.stage === 'p1_solved' && (
                <motion.div key="p1_solved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full">
                  {runnerTab === 'map' ? (
                    <div className="flex-1 min-h-[500px] w-full mt-4">
                      <SectorMap rounds={rounds} currentRound={gameState.round} roundsDone={gameState.roundsDone} stage={gameState.stage} visible={true} role={role} runnerName={session?.team?.runnerName} />
                    </div>
                  ) : (
                    <div className="max-w-md w-full text-center space-y-8 pt-12">
                      <CheckCircle2 className="w-16 h-16 text-[var(--color-accent)] mx-auto" />
                      <h2 className="text-2xl font-bold uppercase tracking-widest">Puzzle Solved</h2>
                      <div className="corner-card glass-morphism p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div><span className="text-[10px] uppercase text-white/40 block">Lat</span><span className="font-mono">{currentRound.coord.lat}</span></div>
                          <div><span className="text-[10px] uppercase text-white/40 block">Lng</span><span className="font-mono">{currentRound.coord.lng}</span></div>
                        </div>
                        <div className="text-left pt-4 border-t border-white/10 flex items-start gap-3">
                          <MapPin className="text-[var(--color-accent)] shrink-0" />
                          <div><p className="font-bold uppercase text-sm">{currentRound.coord.place}</p><p className="text-xs text-white/40">Volunteer: {currentRound.volunteer.name}</p></div>
                        </div>
                      </div>
                      <Button className="w-full h-14 btn-primary glass-morphism" onClick={handleSyncRunnerNode} disabled={isSyncingRunner}>Synchronize Runner</Button>
                    </div>
                  )}
                </motion.div>
              )}

              {['runner_travel', 'runner_entry', 'runner_game', 'runner_done'].includes(gameState.stage) && (
                <motion.div key="runner_phase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
                  {runnerTab === 'map' ? (
                    <div className="flex-1 min-h-[500px]">
                      <SectorMap rounds={rounds} currentRound={gameState.round} roundsDone={gameState.roundsDone} stage={gameState.stage} visible={true} role={role} runnerName={session?.team?.runnerName} />
                    </div>
                  ) : role === 'solver' ? (
                    <div className="max-w-md mx-auto space-y-6 w-full pt-12">
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold uppercase tracking-widest">Sector Ingress</h2>
                        <p className="text-xs text-white/40">
                          {gameState.stage === 'runner_done' ? 'Runner operations complete.' : 'Guide the runner to the target and provide the passkey.'}
                        </p>
                      </div>
                      <div className="corner-card glass-morphism p-6 space-y-4">
                        <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Target</span><span className="font-mono text-xs">{currentRound.coord.place}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Volunteer</span><span className="font-mono text-xs">{currentRound.volunteer.name}</span></div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded text-center"><span className="text-[10px] uppercase text-white/40 block mb-1">Passkey</span><span className="text-xl font-bold tracking-[0.3em]">{currentRound.qrPasskey}</span></div>
                      </div>
                      <div className="text-center p-4">
                        <div className="text-[var(--color-accent)] flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest">
                          <span className="bg-[var(--color-accent)] w-1.5 h-3 block animate-pulse"></span>
                          Awaiting Runner...
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <RunnerGame 
                        token={session!.token} 
                        currentRoundIndex={gameState.round} 
                        totalRounds={rounds.length} 
                        onRoundComplete={sync} 
                        stage={gameState.stage}
                        currentRound={currentRound}
                        onSwitchToMap={() => setRunnerTab('map')}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {gameState.stage === 'final_qr' && (
                <motion.div key="final_qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                  {runnerTab === 'map' ? (
                    <div className="flex-1 min-h-[500px]">
                      <SectorMap rounds={rounds} currentRound={gameState.round} roundsDone={gameState.roundsDone} stage={gameState.stage} visible={true} role={role} runnerName={session?.team?.runnerName} />
                    </div>
                  ) : (
                    <div className={cn("max-w-6xl mx-auto w-full", role === 'runner' ? "flex flex-col items-center justify-center h-full pt-12" : "text-center")}>
                      <div className="space-y-8 flex flex-col justify-center max-w-md w-full">
                        <h2 className="text-3xl font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Extraction Point</h2>
                        {role === 'solver' ? (
                          <div className="corner-card glass-morphism p-8 space-y-6">
                            <p className="text-sm text-white/60">The runner must scan your unique terminal key to complete the extraction.</p>
                            <div className="bg-white p-4 inline-block rounded-lg mx-auto">
                              <QRCodeSVG value={finalQrPayload} size={200} level="H" includeMargin />
                            </div>
                            <p className="font-mono text-xs text-white/40 tracking-widest">{finalQrPayload}</p>
                          </div>
                        ) : (
                          <div className="space-y-6 w-full">
                            <p className="text-xs text-white/40 uppercase">Scan the solver's terminal key.</p>
                            <Button className="w-full h-16 btn-primary" onClick={() => setFinalQrScannerOpen(true)} disabled={isVerifyingFinalQr}>
                              <QrCode className="mr-2" /> Scan Solver Key
                            </Button>
                            {finalQrScannerOpen && <QRScanner onScan={handleVerifyFinalQr} onClose={() => setFinalQrScannerOpen(false)} />}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {gameState.stage === 'complete' && (
                <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center py-12 px-8 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <CheckCircle2 className="w-20 h-20 text-[var(--color-accent)] mx-auto mb-6" />
                  <h1 className="text-4xl font-bold uppercase tracking-[0.2em] mb-2 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Quest Complete</h1>
                  <p className="text-white/70 uppercase tracking-widest mb-12 font-medium">Mission parameters successfully executed.</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="glass-morphism p-8 border border-white/20 bg-black/60 rounded-xl">
                      <span className="text-[10px] uppercase text-white/60 font-bold tracking-widest block mb-2">Operation Time</span>
                      <span className="text-2xl font-mono text-[var(--color-accent)] font-bold">
                        {(() => {
                          const start = gameState?.startTime;
                          const finish = gameState?.finishTime;
                          if (!start || !finish) return '--:--';
                          const d = new Date(finish).getTime() - new Date(start).getTime();
                          const m = Math.floor(d / 60000);
                          const s = Math.floor((d % 60000) / 1000);
                          return `${m}m ${s}s`;
                        })()}
                      </span>
                    </div>
                    <div className="glass-morphism p-8 border border-white/20 bg-black/60 rounded-xl">
                      <span className="text-[10px] uppercase text-white/60 font-bold tracking-widest block mb-2">Final Score</span>
                      <span className="text-2xl font-mono text-[var(--color-accent)] font-bold">{score.toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer / FABs */}
      {session && role && (
        <div className="fixed bottom-6 left-0 w-full px-6 flex justify-between items-center z-[100] pointer-events-none">
          <div className="pointer-events-auto">
            {gameState?.stage !== 'complete' && (
              <button
                onClick={handleRequestHelp}
                disabled={helpCooldown > 0 || isRequestingHelp}
                className={cn("flex items-center gap-2 px-4 py-2 border transition-all", helpCooldown > 0 ? "border-white/10 text-white/20" : "border-red-500/40 text-red-500 hover:bg-red-500/10")}
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{helpCooldown > 0 ? `Wait ${helpCooldown}s` : 'Request Intel'}</span>
              </button>
            )}
          </div>
          <div className="pointer-events-auto">
            <button
              onClick={() => setIsCommsOpen(true)}
              className={cn("w-14 h-14 rounded-full bg-black border border-white/20 flex items-center justify-center shadow-2xl transition-all", isCommsOpen ? "opacity-0 scale-90" : "opacity-100 hover:scale-110")}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {session && role && (
        <TacticalComms
          token={session.token}
          role={session.role}
          isOpen={isCommsOpen}
          onClose={() => setIsCommsOpen(false)}
          lastMessage={gameState?.lastMessage}
          teamName={session.team.name}
          teamRunnerName={session.team.runnerName}
          teamSolverName={session.team.solverName}
        />
      )}
    </>
  );
}
