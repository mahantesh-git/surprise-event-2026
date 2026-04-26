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
  CheckCircle,
  Scan,
  Zap,
  Flame,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Terminal
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
import { getQuestions, compileCode, getFinalRoundQrCode, verifyRunnerFinalQr, RoundQuestion, requestTacticalSupport, claimTeamRoundSwap } from '@/lib/api';
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
import { HardModeHUD } from '@/components/HardModeHUD';
import { SwapConfirmModal } from '@/components/SwapConfirmModal';
const SOLVER_FULLSCREEN_EXIT_KEY = import.meta.env.VITE_SOLVER_EXIT_KEY || 'quest-exit';

const notify = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
  console.log(`[TacticalNotify] ${type.toUpperCase()}: ${msg}`);
  if (type === 'error') {
    alert(`CRITICAL ERROR: ${msg}`);
  }
};

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

    // Step 1: Deployment (Passkey Authentication)
    // Active during solver phase
    if (stepId === 1) {
      if (['p1_solve', 'p1_solved'].includes(s)) return 'active';
      return 'completed';
    }

    // Step 2: Insertion (Infiltration / Scanning)
    // Active while runner is moving to target or scanning at target
    if (stepId === 2) {
      if (['p1_solve', 'p1_solved'].includes(s)) return 'pending';
      if (['runner_travel', 'runner_entry'].includes(s)) return 'active';
      return 'completed';
    }

    // Step 3: Extraction (Data Puzzle Solving / Mini-game)
    // Active during the mini-game
    if (stepId === 3) {
      if (['p1_solve', 'p1_solved', 'runner_travel', 'runner_entry'].includes(s)) return 'pending';
      if (s === 'runner_game') return 'active';
      return 'completed';
    }

    // Step 4: Handoff (Secure Handshake)
    // Active from game completion until quest end
    if (stepId === 4) {
      if (s === 'complete') return 'completed';
      if (['runner_done', 'final_qr'].includes(s)) return 'active';
      return 'pending';
    }

    return 'pending';
  };


  const activeStep = steps.find(s => getStatus(s.id) === 'active')?.id ||
    (getStatus(4) === 'completed' ? 5 : 1);
  const progressPercent = Math.min(((activeStep - 1) / (steps.length - 1)) * 100, 100);

  return (
    <div className="w-full py-12 bg-black/20 border-y border-white/5 backdrop-blur-sm relative overflow-hidden">
      {/* Scanning Line Effect */}
      <motion.div
        animate={{ y: ['0%', '400%'] }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-10 pointer-events-none"
      />

      <div className="relative px-6 md:px-12 max-w-4xl mx-auto">
        {/* Background Track */}
        <div className="absolute top-6 left-12 right-12 h-[1px] bg-white/5 -z-0" />

        {/* Animated Progress Fill */}
        <div className="absolute top-6 left-12 right-12 h-[1px] -z-0">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "circOut" }}
            className="h-full bg-gradient-to-r from-[var(--color-accent)]/20 via-[var(--color-accent)] to-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)]"
          />
        </div>

        <div className="flex justify-between items-start relative">
          {steps.map((step) => {
            const status = getStatus(step.id);
            const Icon = step.icon;
            const isCompleted = status === 'completed';
            const isActive = status === 'active';

            return (
              <div key={step.id} className="flex flex-col items-center group flex-1">
                <div className="relative w-12 h-12">
                  {isActive && (
                    <>
                      {/* Central blinking pulse - smoothed */}
                      <motion.div
                        className="absolute inset-0 bg-[var(--color-accent)] opacity-20 blur-md pointer-events-none"
                        style={{ clipPath: 'var(--clip-oct)' }}
                        animate={{ opacity: [0.05, 0.3, 0.05] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      />
                      
                      {/* Expanding signal waves - smoothed loop with fade-in/out */}
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 border-2 border-[var(--color-accent)] pointer-events-none"
                          style={{ clipPath: 'var(--clip-oct)' }}
                          animate={{ 
                            scale: [1, 2.4], 
                            opacity: [0, 0.7, 0],
                            borderWidth: ['2px', '0.1px']
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 4.5, 
                            delay: i * 1.5,
                            ease: "linear"
                          }}
                        />
                      ))}
                    </>
                  )}
                  
                  {/* Main Point Indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      backgroundColor: isCompleted ? 'var(--color-accent)' : 'rgba(0,0,0,0.6)',
                      borderColor: (isActive || isCompleted) ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'
                    }}
                    className={cn(
                      "w-full h-full flex items-center justify-center transition-shadow duration-700",
                      "clip-oct border relative z-10",
                      isCompleted && "shadow-[0_0_25px_var(--color-accent)]",
                      isActive && "shadow-[0_0_15px_rgba(217,31,64,0.3)]"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 z-20 transition-colors duration-500",
                      isCompleted ? "text-white" :
                        isActive ? "text-[var(--color-accent)]" :
                          "text-white/20"
                    )} />
                  </motion.div>
                </div>

                {/* Label */}
                <div className="mt-4 text-center">
                  <motion.span
                    animate={{ color: (isActive || isCompleted) ? '#fff' : 'rgba(255,255,255,0.2)' }}
                    className={cn(
                      "block font-heading text-[10px] tracking-[0.2em] uppercase font-bold whitespace-nowrap mb-1",
                      isActive && "text-[var(--color-accent)]"
                    )}
                  >
                    {step.label}
                  </motion.span>
                  <span className="block font-mono text-[8px] opacity-30 uppercase tracking-widest hidden lg:block">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [runnerTab, setRunnerTab] = useState<'intel' | 'map'>('intel');
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const normalizedPathname = pathname.replace(/\/$/, '');
  const role = normalizedPathname === '/solver' || normalizedPathname === '/runner' ? (normalizedPathname.slice(1) as Role) : null;
  const { session, gameState, score, loading, login, logout, resetGame, updateState, sync } = useGameState((role ?? 'solver') as Role);

  // Force Map tab when moving to travel phase, and back to Intel for final QR
  useEffect(() => {
    if (gameState?.stage === 'runner_travel' && role === 'runner') {
      setRunnerTab('map');
    } else if (gameState?.stage === 'final_qr') {
      setRunnerTab('intel');
    }
  }, [gameState?.stage, role]);

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
  const [isTacticalMenuOpen, setIsTacticalMenuOpen] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isRequestingHelp, setIsRequestingHelp] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncingRunner, setIsSyncingRunner] = useState(false);
  const [finalQrPayload, setFinalQrPayload] = useState<string>('');
  const [finalQrLoading, setFinalQrLoading] = useState(false);
  const [finalQrError, setFinalQrError] = useState<string | null>(null);
  const [finalQrScannerOpen, setFinalQrScannerOpen] = useState(false);
  const [isVerifyingFinalQr, setIsVerifyingFinalQr] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<{
    stdout: string;
    stderr: string;
    matched: boolean;
    testResults?: Array<{ input: string; passed: boolean; stdout: string; stderr: string }>
  } | null>(null);
  const [isCommsOpen, setIsCommsOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'teams' | 'questions' | 'config' | 'phrases'>('teams');
  const [showFullscreenExitGate, setShowFullscreenExitGate] = useState(false);
  const [fullscreenExitKeyInput, setFullscreenExitKeyInput] = useState('');
  const [fullscreenExitError, setFullscreenExitError] = useState<string | null>(null);
  const [reenteringFullscreen, setReenteringFullscreen] = useState(false);
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; tone: 'info' | 'success' | 'error' | 'warning'; label: string }>>([]);
  const [isObjectiveOpen, setIsObjectiveOpen] = useState(true);

  const previousRoundStateRef = useRef<number | null>(null);
  const lastRunnerHandoffNoticeRef = useRef<string>('');
  const lastSolverCompleteNoticeRef = useRef(false);
  const notificationTimerRef = useRef<number | null>(null);
  const isVerifyingFinalQrRef = useRef(false);
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

  const handleBurnSwap = () => {
    if (!session || isSwapping) return;
    setSwapConfirmOpen(true);
  };

  const executeSwap = async () => {
    if (!session || isSwapping) return;
    
    setIsSwapping(true);
    try {
      await claimTeamRoundSwap(session.token);
      notify('SWAP EXECUTED: NEW MISSION ACQUIRED', 'success');
      setSwapConfirmOpen(false);
      setIsTacticalMenuOpen(false);
      await sync();
    } catch (err: any) {
      notify(err.message || 'Swap operation failed', 'error');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleRequestHelp = async () => {
    if (!session || isRequestingHelp || helpCooldown > 0) return;
    
    setIsRequestingHelp(true);
    try {
      let location: { lat: number, lng: number } | undefined = undefined;
      
      if (role === 'runner') {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
        } catch (e) {
          console.warn("Could not get runner location for intel request", e);
        }
      }

      await requestTacticalSupport(session.token, location);
      notify('INTEL REQUESTED: CHECK COMMS FOR UPDATES', 'success');
      setHelpCooldown(60);
      setIsTacticalMenuOpen(false);
    } catch (err: any) {
      notify(err.message || 'Request failed', 'error');
    } finally {
      setIsRequestingHelp(false);
    }
  };

  const baseRound = (rounds && rounds.length > 0 && gameState) ? rounds[Math.min(gameState.round, rounds.length - 1)] : null;
  const currentRound = gameState ? ((gameState as any)?.activeQuestionOverride || baseRound) : null;

  const isMyTurn = gameState ? (
    (role === 'solver' && ['p1_solve', 'p1_solved'].includes(gameState.stage)) ||
    (role === 'runner' && ['runner_travel', 'runner_entry', 'runner_game', 'runner_done'].includes(gameState.stage)) ||
    gameState.stage === 'final_qr'
  ) : false;

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
          setIsObjectiveOpen(true); // Switch to Mission Intel on new round handoff
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

  const pushNotification = (message: string, tone: 'info' | 'success' | 'error' | 'warning' = 'info', label: string = 'System') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, tone, label }]);
    window.setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4500);
  };

  useEffect(() => {
    if (!gameState || !session || !role) return;
    const prevRound = previousRoundStateRef.current;
    const handoffKey = `${gameState.round}:${gameState.handoff?.passkey ?? ''}`;

    if (role === 'runner' && gameState.stage === 'runner_travel' && gameState.handoff?.passkey && lastRunnerHandoffNoticeRef.current !== handoffKey) {
      pushNotification(`Solver synchronized round ${gameState.round + 1}. Travel to coordinates.`.toUpperCase());
      lastRunnerHandoffNoticeRef.current = handoffKey;
    }

    if (role === 'solver' && prevRound !== null && gameState.round > prevRound && gameState.stage === 'p1_solve') {
      pushNotification(`Runner finished round ${prevRound + 1}. Round ${gameState.round + 1} is unlocked.`.toUpperCase(), 'success');
    }

    if (role === 'solver' && gameState.stage === 'complete' && !lastSolverCompleteNoticeRef.current) {
      pushNotification('Quest completed.'.toUpperCase(), 'success');
      lastSolverCompleteNoticeRef.current = true;
    }

    if (gameState.lastMessage && gameState.lastMessage.timestamp > lastMessageNoticeRef.current) {
      if (gameState.lastMessage.senderRole !== session.role) {
        let formattedMessage = '';
        if (gameState.lastMessage.senderRole === 'admin') {
          formattedMessage = `admin:${gameState.lastMessage.text}`;
        } else {
          const teamName = session.team?.name || 'TEAM';
          const senderName = gameState.lastMessage.senderRole === 'runner' 
            ? session.team?.runnerName || 'RUNNER'
            : session.team?.solverName || 'SOLVER';
          formattedMessage = `${teamName}[${senderName}]:${gameState.lastMessage.text}`;
        }
        pushNotification(formattedMessage.toUpperCase(), 'info', 'INCOMING TRANSMISSION');
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
    setIsObjectiveOpen(false); // Auto-flip to console when running code
    try {
      if (!currentRound) throw new Error('No active round data');
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
      if (!currentRound) return;
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
      pushNotification('Verification failed'.toUpperCase(), 'info');
    } finally {
      isVerifyingFinalQrRef.current = false;
      setIsVerifyingFinalQr(false);
    }
  };

  const glitchVariants = {
    initial: { opacity: 0, skewX: -15, filter: 'brightness(2) contrast(1.2)', x: -20 },
    animate: { opacity: 1, skewX: 0, filter: 'brightness(1) contrast(1)', x: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, skewX: 15, filter: 'brightness(0) contrast(1.5)', x: 20, transition: { duration: 0.3 } }
  };

  const clipVariants = {
    initial: { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 },
    animate: { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] as const } },
    exit: { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0, transition: { duration: 0.5 } }
  };

  const fadeScaleVariants = {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, scale: 1.02, transition: { duration: 0.4 } }
  };

  const renderAppContent = () => {
    if (pathname === '/admin') {
      return (
        <motion.div key="admin" variants={fadeScaleVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 w-full min-h-screen">
          <AdminPanel
            onBack={() => {
              window.history.pushState({}, '', '/');
              setPathname('/');
            }}
          />
        </motion.div>
      );
    }

    if (!session || !role) {
      return (
        <motion.div key="auth-container" className="relative z-10 w-full min-h-screen flex flex-col">
          <AnimatePresence mode="wait">
            {!role ? (
              <motion.div
                key="role"
                variants={fadeScaleVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                <RoleSelection onSelect={(r) => { window.history.pushState({}, '', `/${r}`); setPathname(`/${r}`); }} />
              </motion.div>
            ) : (
              <motion.div
                key="login"
                variants={fadeScaleVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex-1"
              >
                <LoginScreen
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    if (loading || roundsLoading || !gameState) {
      return (
        <motion.div key="loading" variants={fadeScaleVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 w-full min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
        </motion.div>
      );
    }

    if (roundsError || !rounds.length) {
      return (
        <motion.div key="error" variants={fadeScaleVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 w-full min-h-screen flex items-center justify-center text-white p-6">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-red-500">System Error</h2>
            <p className="text-sm opacity-60">{roundsError || 'No mission rounds configured.'}</p>
            <Button onClick={() => window.location.reload()}>Retry Sync</Button>
          </div>
        </motion.div>
      );
    }

    if (!currentRound) return null;

    return (
      <motion.div key="game" variants={glitchVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 w-full min-h-screen">
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

      <PersistentProgress totalRounds={rounds.length} currentRound={gameState?.round ?? 0} roundsDone={gameState?.roundsDone ?? []} difficulty={gameState?.difficulty} />

      {gameState.difficulty === 'hard' && gameState.stage === 'p1_solve' && (
        <HardModeHUD startTime={gameState.currentRoundStartTime || ''} />
      )}

      <Navbar
        brandName={`QUEST : ${session?.team?.name || 'TEAM'}`}
        ctaText="SYSTEM"
        metaText={role.toUpperCase()}
        startTime={gameState?.startTime}
        finishTime={gameState?.finishTime}
      />

      <div className={cn(
        "pt-28 pb-40 px-3 relative z-10 flex flex-col max-w-[1400px] mx-auto w-full h-[100dvh]",
        role === 'runner' ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
      )}>
        {gameState && (role === 'runner' && ['runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr'].includes(gameState.stage)) &&
          gameState.stage !== 'complete' && gameState.stage !== 'final_qr' && (
            <div className="mb-8 flex gap-1 h-14 shrink-0">
              <button
                onClick={() => setRunnerTab('intel')}
                className={cn(
                  "flex-1 h-full flex items-center justify-center gap-2 transition-all duration-300 font-bold uppercase tracking-[0.2em] text-[10px] relative overflow-hidden group border border-white/5",
                  runnerTab === 'intel' ? "bg-white text-black" : "bg-black text-white/20 hover:text-white/40"
                )}
              >
                {runnerTab === 'intel' && (
                  <motion.div layoutId="tab-active-bg" className="absolute inset-0 bg-white" />
                )}
                <Activity className={cn("w-3.5 h-3.5 z-20", runnerTab === 'intel' ? "text-black" : "text-white/20")} />
                <span className="z-20">Tactical Intel</span>
              </button>
              <button
                onClick={() => setRunnerTab('map')}
                className={cn(
                  "flex-1 h-full flex items-center justify-center gap-2 transition-all duration-300 font-bold uppercase tracking-[0.2em] text-[10px] relative overflow-hidden group border border-white/5",
                  runnerTab === 'map' ? "bg-white text-black" : "bg-black text-white/20 hover:text-white/40"
                )}
              >
                {runnerTab === 'map' && (
                  <motion.div layoutId="tab-active-bg" className="absolute inset-0 bg-white" />
                )}
                <MapPin className={cn("w-3.5 h-3.5 z-20", runnerTab === 'map' ? "text-black" : "text-white/20")} />
                <span className="z-20">Sector Map</span>
              </button>
            </div>
          )}

        <div className="border-b border-white/10 pb-4 mb-6 flex justify-between items-end">
          <div>
            <span className="label-technical text-[var(--color-accent)] mb-1 block">Operational Telemetry</span>
            <h1 className="text-3xl font-bold uppercase tracking-tighter">Round <span className="text-[var(--color-accent)]">0{gameState.round + 1}</span></h1>
          </div>
          <Badge variant="outline" className="uppercase tracking-widest px-3 py-1 border-[var(--color-accent)]/40 text-[var(--color-accent)]">{role}</Badge>
        </div>

        {role === 'solver' && ['runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr'].includes(gameState.stage) && (
          <div className="mb-8 px-2">
            <TacticalProgressBar stage={gameState.stage} />
          </div>
        )}

        {!isMyTurn && gameState.stage !== 'complete' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col p-4"
          >
            {role === 'runner' && runnerTab === 'map' && ['runner_travel', 'runner_entry', 'runner_game', 'runner_done', 'final_qr'].includes(gameState.stage) ? (
              <motion.div key="awaiting-map" variants={clipVariants} initial="initial" animate="animate" exit="exit" className="flex-1 min-h-[500px] w-full">
                <SectorMap rounds={rounds} currentRound={gameState.round} activeQuestion={currentRound} roundsDone={gameState.roundsDone} stage={gameState.stage} visible={true} role={role} runnerName={session?.team?.runnerName} />
              </motion.div>
            ) : (
              <div className="max-w-6xl w-full text-center space-y-12 relative mx-auto my-auto px-3">
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
                <motion.div key="p1_solve" variants={glitchVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col gap-4 h-full w-full">
                  {/* Objective Header */}
                  <div className="flex items-center gap-6 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded">
                        <BookOpen className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Mission Objective</h2>
                        <p className="text-[9px] font-mono text-white/40 uppercase">Phase 01: Data Decryption</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsObjectiveOpen(!isObjectiveOpen)}
                      className="text-[10px] uppercase font-bold tracking-widest bg-[var(--color-accent)] text-black hover:brightness-110 transition-all border-none"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      {isObjectiveOpen ? 'View Console' : 'View Intel'}
                    </Button>
                  </div>

                  <div className="flex flex-row gap-4 flex-[10] min-h-0 w-full">
                    <div className="flex flex-col flex-[3] min-h-[300px] min-w-0">
                      <CodeEditor
                        value={p1Code}
                        onChange={setP1Code}
                        language={selectedLanguage}
                        onLanguageChange={(l, s) => { setSelectedLanguage(l); setP1Code(s); }}
                        onRun={() => runCode()}
                        height="100%"
                      />
                    </div>
                    
                    <div className="flex flex-col flex-1 min-w-[250px] gap-3 relative" style={{ perspective: '1000px' }}>
                      <div className="flex-1 relative">
                        <AnimatePresence mode="wait">
                          {isObjectiveOpen ? (
                            <motion.div 
                              key="intel"
                              initial={{ rotateY: -90, opacity: 0 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              exit={{ rotateY: 90, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 corner-card glass-morphism p-6 flex flex-col overflow-y-auto custom-scrollbar"
                            >
                              <div className="mb-4 shrink-0">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] font-bold">Mission Intel</span>
                              </div>
                              <h3 className="text-lg font-bold uppercase text-[var(--color-accent)] mb-4 shrink-0">{currentRound.p1.title}</h3>
                              <div className="p-5 glass-morphism-inner bg-black/40 rounded-lg flex-1 overflow-y-auto custom-scrollbar">
                                <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-white/90">{currentRound.p1.hint}</p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="console"
                              initial={{ rotateY: -90, opacity: 0 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              exit={{ rotateY: 90, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute inset-0 corner-card glass-morphism-dark p-6 flex flex-col overflow-y-auto custom-scrollbar font-mono text-[11px]"
                            >
                              <div className="mb-3 shrink-0">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] font-bold">Execution Console</span>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                                  <div className="space-y-2">
                                    {consoleOutput.matched && (
                                      <div className="flex items-center gap-2 text-[var(--color-accent)] font-bold animate-pulse uppercase mb-4 p-2 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Protocol Verified. Access Granted.
                                      </div>
                                    )}
                                    {consoleOutput.testResults && consoleOutput.testResults.length > 0 ? (
                                      <div className="space-y-4 mt-2">
                                        {consoleOutput.testResults.map((tr: any, idx: number) => (
                                          <div key={idx} className="border border-white/10 p-2 rounded bg-white/5">
                                            <div className="flex justify-between items-center mb-1">
                                              <span className="font-bold">Test Case {idx + 1}</span>
                                              <span className={tr.passed ? "text-green-400" : "text-red-400"}>
                                                {tr.passed ? "PASSED" : "FAILED"}
                                              </span>
                                            </div>
                                            {tr.input && (
                                              <div className="mb-1">
                                                <span className="text-white/40 text-[9px] uppercase">Input:</span>
                                                <pre className="text-white/80 whitespace-pre-wrap">{tr.input}</pre>
                                              </div>
                                            )}
                                            {tr.stderr ? (
                                              <div>
                                                <span className="text-white/40 text-[9px] uppercase">Error:</span>
                                                <pre className="text-red-400 whitespace-pre-wrap">{tr.stderr}</pre>
                                              </div>
                                            ) : tr.stdout ? (
                                              <div>
                                                <span className="text-white/40 text-[9px] uppercase">Output:</span>
                                                <pre className="text-white/80 whitespace-pre-wrap">{tr.stdout}</pre>
                                              </div>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <>
                                        {consoleOutput.stderr && <pre className="text-red-400 whitespace-pre-wrap">{consoleOutput.stderr}</pre>}
                                        {consoleOutput.stdout && <pre className="text-white/80 whitespace-pre-wrap">{consoleOutput.stdout}</pre>}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <Button
                        className="w-full h-12 shrink-0 bg-transparent border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors font-bold uppercase tracking-[0.2em]"
                        style={{ clipPath: 'var(--clip-oct)' }}
                        onClick={() => runCode()}
                        disabled={isRunning}
                      >
                        {isRunning ? 'EXECUTING...' : '▶ RUN CODE'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {gameState.stage === 'p1_solved' && (
                <motion.div key="p1_solved" variants={glitchVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center h-full">
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
                    <Button className="w-full h-14 btn-primary glass-morphism font-bold uppercase tracking-[0.2em]" onClick={handleSyncRunnerNode} disabled={isSyncingRunner}>
                      {isSyncingRunner ? 'SYNCHRONIZING...' : 'Synchronize Runner'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {['runner_travel', 'runner_entry', 'runner_game', 'runner_done'].includes(gameState.stage) && (
                <motion.div key="runner_phase" variants={glitchVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col">
                  {role === 'runner' && runnerTab === 'map' ? (
                    <motion.div key="active-map" variants={clipVariants} initial="initial" animate="animate" exit="exit" className="flex-1 min-h-[500px] relative">
                      <SectorMap rounds={rounds} currentRound={gameState.round} activeQuestion={currentRound} roundsDone={gameState.roundsDone} stage={gameState.stage} visible={true} role={role} runnerName={session?.team?.runnerName} />
                    </motion.div>
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
                        difficulty={gameState.difficulty as 'normal' | 'hard'}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {gameState.stage === 'final_qr' && (
                <motion.div key="final_qr" variants={glitchVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center w-full pt-12">
                  <div className="space-y-8 flex flex-col items-center justify-center max-w-md w-full">
                    <h2 className="text-3xl font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Extraction Point</h2>
                    {role === 'solver' ? (
                      <div className="corner-card glass-morphism p-8 space-y-6 text-center flex flex-col items-center">
                        <p className="text-sm text-white/60">The runner must scan your unique terminal key to complete the extraction.</p>
                        <div className="bg-white p-4 inline-block rounded-lg">
                          <QRCodeSVG value={finalQrPayload} size={200} level="H" includeMargin />
                        </div>
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
                </motion.div>
              )}

              {gameState.stage === 'complete' && (
                <motion.div key="complete" variants={fadeScaleVariants} initial="initial" animate="animate" exit="exit" className="max-w-2xl mx-auto text-center py-12 px-8 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
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

      </motion.div>
    );
  };

  return (
    <>
      <TacticalBackground />
      <AnimatePresence mode="wait">
        {renderAppContent()}
      </AnimatePresence>

      {/* Persistent Tactical Footer Bar */}
      {session && role && (
        <div className="fixed bottom-0 left-0 w-full px-6 py-4 flex justify-between items-center z-[200000] bg-black/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <AnimatePresence>
              {isTacticalMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-4 flex flex-col gap-2 min-w-[200px]"
                >
                  <button
                    onClick={handleBurnSwap}
                    disabled={isSwapping}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all uppercase text-[10px] font-black tracking-widest"
                  >
                    <span className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5" />
                      Burn Swap
                    </span>
                    {isSwapping && <Loader2 className="w-3 h-3 animate-spin" />}
                  </button>

                  <button
                    onClick={handleRequestHelp}
                    disabled={helpCooldown > 0 || isRequestingHelp}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border border-amber-500/30 transition-all uppercase text-[10px] font-black tracking-widest",
                      helpCooldown > 0 ? "text-white/20 border-white/5" : "text-amber-500 hover:bg-amber-500/10"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {helpCooldown > 0 ? `Intel Locked (${helpCooldown}s)` : 'Request Intel'}
                    </span>
                    {isRequestingHelp && <Loader2 className="w-3 h-3 animate-spin" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsTacticalMenuOpen(!isTacticalMenuOpen)}
              className={cn(
                "flex items-center gap-2 px-6 h-12 border transition-all uppercase text-[11px] font-black tracking-[0.2em] shadow-lg",
                isTacticalMenuOpen 
                  ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]" 
                  : "bg-white/10 border-white/20 text-white hover:border-[var(--color-accent)] hover:bg-white/20"
              )}
            >
              <Zap className={cn("w-4 h-4", isTacticalMenuOpen ? "fill-current" : "text-[var(--color-accent)] animate-pulse")} />
              Tactical Ops
            </button>
          </div>

          <div>
            <button
              onClick={() => setIsCommsOpen(true)}
              className={cn(
                "w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center transition-all shadow-lg",
                isCommsOpen ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 hover:bg-white/20 hover:border-[var(--color-accent)]"
              )}
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {session && role && (
        <>
          <TacticalComms
            token={session!.token}
            role={session!.role}
            isOpen={isCommsOpen}
            onClose={() => setIsCommsOpen(false)}
            lastMessage={gameState?.lastMessage}
            teamName={session!.team.name}
            teamRunnerName={session!.team.runnerName}
            teamSolverName={session!.team.solverName}
          />
          <SwapConfirmModal
            isOpen={swapConfirmOpen}
            onClose={() => setSwapConfirmOpen(false)}
            onConfirm={executeSwap}
            isLoading={isSwapping}
          />
        </>
      )}
    </>
  );
}
