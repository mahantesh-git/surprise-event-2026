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
  Copy
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

const SOLVER_FULLSCREEN_EXIT_KEY = import.meta.env.VITE_SOLVER_EXIT_KEY || 'quest-exit';

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const normalizedPathname = pathname.replace(/\/$/, '');
  const role = normalizedPathname === '/solver' || normalizedPathname === '/runner' ? (normalizedPathname.slice(1) as Role) : null;
  const { session, gameState, loading, login, logout, resetGame, updateState, sync } = useGameState((role ?? 'solver') as Role);
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
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err', msg: string } | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; tone: 'info' | 'success' }>>([]);
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
  // Ref guard for final QR — prevents duplicate API calls before React state updates
  const isVerifyingFinalQrRef = useRef(false);
  // Prevents the final_qr runner notification from firing more than once
  const lastFinalQrNoticeRef = useRef(false);
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
      // iOS 13+ requires explicit user gesture to grant compass access
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

  const solverExitAuthorizedRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  const lastMessageNoticeRef = useRef<number>(0);


  // Stream runner GPS to backend while in field stages
  useRunnerGps(
    session?.token ?? null,
    gameState?.stage ?? null
  );

  // ── WebSocket lifecycle: connect on login, disconnect on logout ───────────
  const { connect: socketConnect, disconnect: socketDisconnect } = useSocket();
  useEffect(() => {
    // AdminPanel manages its own admin socket connection. If we're on the admin
    // route, don't let the team session lifecycle interfere with it.
    if (pathname === '/admin') return;

    if (session?.token) {
      socketConnect(session.token);
    } else {
      socketDisconnect();
    }
  }, [session?.token, pathname, socketConnect, socketDisconnect]);

  // Sync top-level location changes on popstate
  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Request Notification Permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const [helpCooldown, setHelpCooldown] = useState(0);
  const helpCooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown timer effect
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
    if (helpCooldown > 0 || !session) return;

    let coords: { lat: number; lng: number } | undefined;

    // Attempt to get high-accuracy location for tactical support
    if (role === 'runner' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000, // 15s for mobile cold fix
            maximumAge: 0
          });
        });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (err) {
        console.warn('High-accuracy GPS failed, trying fallback...', err);
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000
            });
          });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (fallbackErr) {
          console.warn('Tactical GPS fallback failed:', fallbackErr);
        }
      }
    }

    try {
      await requestTacticalSupport(session.token, coords);
      pushNotification('Tactical Support requested. Mission Control has been notified.', 'success');
      setHelpCooldown(60); // 1 minute cooldown for tactical bridge
    } catch (err) {
      pushNotification('Failed to reach Mission Control. Check your signal.', 'info');
    }
  };

  useEffect(() => {
    if (!role) return;

    if (rounds.length === 0) {
      setRoundsLoading(true);
    }
    
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
          setRounds(prev => prev.length > 0 ? prev : []);
          setRoundsError(error instanceof Error ? error.message : 'Failed to load questions');
        } else {
          console.warn('Failed to fetch rounds, using cached data.', error);
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
          setFeedback(null);
        }
      }
      previousRoundRef.current = gameState.round;
    }
  }, [gameState?.round, gameState?.stage, rounds]);

  useEffect(() => {
    if (!session?.token || !gameState) {
      setFinalQrPayload('');
      setFinalQrError(null);
      setFinalQrLoading(false);
      setFinalQrScannerOpen(false);
      return;
    }

    if (gameState.stage !== 'final_qr') {
      setFinalQrPayload('');
      setFinalQrError(null);
      setFinalQrLoading(false);
      setFinalQrScannerOpen(false);
      lastFinalQrNoticeRef.current = false; // Reset so it fires again next time stage enters final_qr
      return;
    }

    if (role === 'solver') {
      setFinalQrLoading(true);
      setFinalQrError(null);
      getFinalRoundQrCode(session.token)
        .then((result) => {
          setFinalQrPayload(result.qrCode);
        })
        .catch((error) => {
          setFinalQrError(error instanceof Error ? error.message : 'Failed to load final QR code');
        })
        .finally(() => setFinalQrLoading(false));
      return;
    }

    // Only notify runner once per final_qr stage entry
    if (!lastFinalQrNoticeRef.current) {
      lastFinalQrNoticeRef.current = true;
      pushNotification('Runner final step: scan the solver finish QR to complete the quest.');
    }
  }, [gameState?.stage, role, session?.token]);

  const pushNotification = (message: string, tone: 'info' | 'success' = 'info') => {
    // Play notification sound
    try {
      const audio = new Audio('/sounds/mixkit-sci-fi-positive-notification-266.wav');
      audio.volume = 0.7;
      audio.play().catch(() => { }); // Catch play errors if user hasn't interacted
    } catch (err) {
      console.warn('Notification sound failed:', err);
    }

    // Haptic feedback (Vibration)
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]); // Short double pulse for tactical feel
    }

    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, tone }]);

    window.setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  useEffect(() => {
    if (!gameState || !session || !role) {
      previousRoundStateRef.current = null;
      lastRunnerHandoffNoticeRef.current = '';
      lastSolverCompleteNoticeRef.current = false;
      return;
    }

    const prevRound = previousRoundStateRef.current;
    const handoffKey = `${gameState.round}:${gameState.handoff?.passkey ?? ''}`;

    if (
      role === 'runner'
      && gameState.stage === 'runner_travel'
      && gameState.handoff?.passkey
      && lastRunnerHandoffNoticeRef.current !== handoffKey
    ) {
      pushNotification(`Solver synchronized round ${gameState.round + 1}. Travel and scan the location QR.`);
      lastRunnerHandoffNoticeRef.current = handoffKey;
    }

    if (
      role === 'solver'
      && prevRound !== null
      && gameState.round > prevRound
      && gameState.stage === 'p1_solve'
    ) {
      pushNotification(`Runner finished round ${prevRound + 1}. Round ${gameState.round + 1} is now unlocked.`, 'success');
    }

    if (
      role === 'solver'
      && gameState.stage === 'complete'
      && !lastSolverCompleteNoticeRef.current
    ) {
      pushNotification('Runner finished the final round. Quest completed.', 'success');
      lastSolverCompleteNoticeRef.current = true;
    }

    previousRoundStateRef.current = gameState.round;

    // Tactical Comms Notification
    if (gameState.lastMessage) {
      // Initialize ref on first message load to avoid old notifications
      if (lastMessageNoticeRef.current === 0) {
        lastMessageNoticeRef.current = gameState.lastMessage.timestamp;
      } else if (gameState.lastMessage.timestamp > lastMessageNoticeRef.current) {

        // Determine if message is targeted at this user
        const targetRole = (gameState.lastMessage as any).targetRole || 'all';
        const isTargeted = targetRole === 'all' || targetRole === session.role;

        if (gameState.lastMessage.senderRole === 'admin') {
          if (isTargeted) {
            pushNotification(`[COMMAND OVERRIDE]: ${gameState.lastMessage.text}`, 'success');
          }
        } else if (gameState.lastMessage.senderRole !== session.role) {
          const senderName = gameState.lastMessage.senderRole === 'runner'
            ? (session.team.runnerName || 'RUNNER').toUpperCase()
            : (session.team.solverName || 'SOLVER').toUpperCase();
          pushNotification(`${session.team.name.toUpperCase()}[${senderName}]: ${gameState.lastMessage.text}`, 'success');
        }
        lastMessageNoticeRef.current = gameState.lastMessage.timestamp;
      }
    }
  }, [gameState, role, session]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        window.clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // Global Scrollbar Hide
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'hide-scrollbar-style';
    style.textContent = `
      *::-webkit-scrollbar { display: none !important; }
      * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById('hide-scrollbar-style');
      if (existing) document.head.removeChild(existing);
    };
  }, []);

  useEffect(() => {
    if (!session || (role !== 'solver' && role !== 'runner')) {
      setShowFullscreenExitGate(false);
      setFullscreenExitKeyInput('');
      setFullscreenExitError(null);
      solverExitAuthorizedRef.current = false;
      wasFullscreenRef.current = false;
      return;
    }

    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;

      if (!isFullscreen && solverExitAuthorizedRef.current) {
        solverExitAuthorizedRef.current = false;
      } else if (!isFullscreen && wasFullscreenRef.current && !solverExitAuthorizedRef.current) {
        setShowFullscreenExitGate(true);
        setFullscreenExitError(null);
        setFullscreenExitKeyInput('');
      }

      wasFullscreenRef.current = isFullscreen;
    };

    wasFullscreenRef.current = !!document.fullscreenElement;
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [session, role]);

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
            <motion.div
              key="role-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <RoleSelection
                onSelect={(selectedRole: Role) => {
                  const nextPath = `/${selectedRole}`;
                  window.history.pushState({}, '', nextPath);
                  setPathname(nextPath);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="login-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <LoginScreen
                role={role!}
                teamName={teamName}
                password={password}
                onTeamNameChange={setTeamName}
                onPasswordChange={setPassword}
                onLogin={handleLogin}
                isLoggingIn={isLoggingIn}
                loginError={loginError}
                onAdminClick={() => {
                  window.history.pushState({}, '', '/admin');
                  setPathname('/admin');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (loading || roundsLoading) return null;


  const handleAllowFullscreenExit = async () => {
    if (fullscreenExitKeyInput.trim() !== SOLVER_FULLSCREEN_EXIT_KEY) {
      setFullscreenExitError('Invalid exit key');
      return;
    }

    setShowFullscreenExitGate(false);
    setFullscreenExitError(null);
    setFullscreenExitKeyInput('');

    if (document.fullscreenElement) {
      // Single-use authorization only for this immediate exit action.
      solverExitAuthorizedRef.current = true;
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore browser exit errors and keep current display mode.
      }
      return;
    }

    // If solver already exited before entering key, do not persist authorization.
    solverExitAuthorizedRef.current = false;
  };

  const handleReturnToFullscreen = async () => {
    setReenteringFullscreen(true);
    setFullscreenExitError(null);
    const ok = await requestAppFullscreen();
    setReenteringFullscreen(false);
    if (ok || document.fullscreenElement) {
      setShowFullscreenExitGate(false);
      setFullscreenExitKeyInput('');
      wasFullscreenRef.current = true;
      return;
    }

    setFullscreenExitError('Unable to re-enter fullscreen automatically. Try again.');
  };



  if (roundsError) {
    return (
      <>
        <TacticalBackground />
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 text-white reveal-up">
          <Card className="max-w-md w-full border-[#ff4500]/30 bg-[#141419]/85 backdrop-blur-xl shadow-[0_0_50px_rgba(255,69,0,0.1)]">
            <CardHeader>
              <CardTitle className="text-[#ff4500] font-mono tracking-tighter uppercase">Connection Failed</CardTitle>
              <CardDescription className="text-white/60 font-mono text-xs">{roundsError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-[#ff4500] hover:bg-[#ff4500]/80 text-white font-bold uppercase tracking-widest text-xs h-12"
              >
                Reconnect Protocol
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!rounds.length) {
    return (
      <>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 text-white reveal-up">
          <Card className="max-w-md w-full border-[#ff4500]/30 bg-[#141419]/85 backdrop-blur-xl shadow-[0_0_50px_rgba(255,69,0,0.1)]">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 bg-[#ff4500] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#ff4500]">System Warning</span>
              </div>
              <CardTitle className="text-2xl font-black uppercase tracking-tighter mb-2">No Questions Configured</CardTitle>
              <CardDescription className="text-white/60 font-mono text-xs uppercase leading-relaxed">
                Terminal is active but mission parameters are missing. Authorized administrators must initialize mission rounds via the control console.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  window.history.pushState({}, '', '/admin');
                  setPathname('/admin');
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-widest text-xs h-12 transition-all"
              >
                Access Admin Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const currentRound = rounds[Math.min(gameState!.round, rounds.length - 1)];

  const initEditorForRound = (round: typeof currentRound) => {
    const defaultLang = (round.p1.language ?? 'python') as SupportedLanguage;
    setSelectedLanguage(defaultLang);
    setP1Code(LANGUAGE_TEMPLATES[defaultLang]);
    setConsoleOutput(null);
    setFeedback(null);
  };

  const normalizeAnswer = (value: string) => value.replace(/\r\n/g, '\n').trim();

  const runCode = async (codeOverride?: string) => {
    const codeToRun = typeof codeOverride === 'string' ? codeOverride : p1Code;
    if (!session?.token || !codeToRun.trim() || isRunning) return;
    setIsRunning(true);
    setConsoleOutput(null);
    try {
      const result = await compileCode(session.token, currentRound.id, codeToRun, selectedLanguage);

      if (result.timedOut) {
        setConsoleOutput({ stdout: '', stderr: 'Execution timed out (10s limit exceeded).', matched: false });
        return;
      }

      if (!result.ok && !result.testResults?.length) {
        setConsoleOutput({ stdout: '', stderr: 'Compilation or initialization error.', matched: false });
        return;
      }

      const allPassed = result.testResults?.every(r => r.passed) ?? false;

      setConsoleOutput({
        stdout: result.testResults?.[result.testResults.length - 1]?.stdout || '',
        stderr: result.testResults?.[result.testResults.length - 1]?.stderr || '',
        matched: allPassed,
        testResults: result.testResults
      });

      if (allPassed) {
        setTimeout(() => {
          updateState({ stage: 'p1_solved' });
          setConsoleOutput(null);
        }, 1500);
      }
    } catch (error) {
      setConsoleOutput({ stdout: '', stderr: error instanceof Error ? error.message : 'Execution failed', matched: false });
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
    } finally {
      setIsSyncingRunner(false);
    }
  };

  const handleArrivedAtLocation = async () => {
    if (isEnteringRunnerGame) return;
    setIsEnteringRunnerGame(true);
    try {
      await updateState({ stage: 'runner_game' });
    } finally {
      setIsEnteringRunnerGame(false);
    }
  };

  const handleVerifyFinalQr = async (decodedValue: string) => {
    // Use a ref guard (not just state) so this is synchronous and race-condition-proof
    if (!session?.token || isVerifyingFinalQrRef.current) return;
    isVerifyingFinalQrRef.current = true;
    setIsVerifyingFinalQr(true);
    try {
      await verifyRunnerFinalQr(session.token, decodedValue.trim());
      setFinalQrScannerOpen(false);
      await sync();
    } catch (error) {
      pushNotification(error instanceof Error ? error.message : 'Final QR verification failed');
    } finally {
      isVerifyingFinalQrRef.current = false;
      setIsVerifyingFinalQr(false);
    }
  };

  const finalQrImageUrl = finalQrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(finalQrPayload)}`
    : '';

  const nextRound = () => {
    if (gameState!.round < rounds.length - 1) {
      updateState({ round: gameState!.round + 1, stage: 'p1_solve', handoff: null });
    } else updateState({ stage: 'complete' });
  };

  const isMyTurn = (role === 'solver' && ['p1_solve', 'p1_solved'].includes(gameState!.stage)) ||
    (role === 'runner' && ['runner_travel', 'runner_game', 'runner_done'].includes(gameState!.stage))
    || gameState!.stage === 'final_qr';

  return (
    <>
      <TacticalBackground />
      <AnimatePresence>
        {showFullscreenExitGate && (role === 'solver' || role === 'runner') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md corner-card border border-[var(--color-accent)]/40 !bg-[var(--color-bg-surface)] p-6 sm:p-8 shadow-2xl"
            >
              <div className="space-y-5">
                <div className="space-y-2 text-center">
                  <h2 className="text-[var(--color-accent)] text-lg sm:text-xl font-black uppercase tracking-[0.2em]">Exit Fullscreen?</h2>
                  <p className="text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.12em]">
                    Enter security key to leave {role} fullscreen mode.
                  </p>
                </div>

                <input
                  type="password"
                  value={fullscreenExitKeyInput}
                  onChange={(event) => setFullscreenExitKeyInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleAllowFullscreenExit()}
                  placeholder="EXIT_KEY"
                  className="w-full high-clearance-input !bg-black/40 text-center h-12"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />

                {fullscreenExitError && (
                  <div className="flex justify-center">
                    <TacticalStatus
                      tone="error"
                      label="Security Alert"
                      message={fullscreenExitError}
                      icon={AlertCircle}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    className="flex-1 font-bold uppercase tracking-[0.16em] h-11 btn-secondary"
                    onClick={handleReturnToFullscreen}
                    disabled={reenteringFullscreen}
                  >
                    {reenteringFullscreen ? 'Re-entering...' : 'Stay Fullscreen'}
                  </Button>
                  <Button
                    className="flex-1 font-bold uppercase tracking-[0.16em] h-11 btn-primary"
                    onClick={handleAllowFullscreenExit}
                  >
                    Allow Exit
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-[70px] sm:top-[84px] left-1/2 -translate-x-1/2 z-[40] flex flex-col gap-2 w-max max-w-[calc(100vw-32px)]">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
            >
              <TacticalStatus
                tone={notif.tone}
                label={notif.tone === 'success' ? 'System Success' : 'System Notice'}
                message={notif.message}
                icon={notif.tone === 'success' ? CheckCircle2 : Activity}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <PersistentProgress totalRounds={rounds.length} currentRound={gameState?.round ?? 0} roundsDone={gameState?.roundsDone ?? []} />
      <GridBackground />
      <Navbar
        brandName={`QUEST : THE ${session.team.name}`}
        ctaText="SYSTEM"
        metaText={role === 'solver' ? (session.team.solverName || 'SOLVER').toUpperCase() : (session.team.runnerName || 'RUNNER').toUpperCase()}
        onMenuOpen={() => { }}
        startTime={gameState?.startTime}
        finishTime={gameState?.finishTime}
      />

      <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 relative z-10 text-white bg-transparent reveal-up overflow-x-hidden flex flex-col">
        <div className="w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="shrink-0 mb-8 mt-2 sm:mt-4">
            <div className="flex flex-row items-end justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3 w-3 text-[var(--color-accent)] fill-[var(--color-accent)]" />
                  <span className="label-technical text-[9px] sm:text-[10px]">Operational Telemetry</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tighter leading-none font-space-grotesk">
                  ROUND <span className="text-[var(--color-accent)]">0{gameState!.round + 1}</span>
                </h1>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className="uppercase text-[9px] border-[var(--color-accent)]/40 text-[var(--color-accent)] bg-[var(--color-accent)]/5 px-2 py-0.5 rounded-none tracking-widest font-mono">{role}</Badge>
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-tight hidden sm:block">{session.team.name} @ SYSTEM_ROOT</span>
              </div>
            </div>
          </div>

          {/* Runner Tab Switcher */}
          {role === 'runner' && gameState!.stage !== 'complete' && (
            <div className="flex gap-2 mb-6 p-1.5 glass-morphism border border-white/10 rounded-xl w-full">
              <button
                onClick={() => setRunnerTab('intel')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-lg font-mono text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px]',
                  runnerTab === 'intel'
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}
              >
                <Activity className="w-4 h-4 shrink-0" />
                Tactical Intel
              </button>
              <button
                onClick={() => setRunnerTab('map')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-lg font-mono text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px]',
                  runnerTab === 'map'
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}
              >
                <MapPin className="w-4 h-4 shrink-0" />
                Sector Map
              </button>
            </div>
          )}

          {/* Main Content */}

          {/* Sector Map — always mounted to prevent Leaflet re-init on tab switch; hidden via CSS */}
          {role === 'runner' && gameState!.stage !== 'complete' && (
            <div className={cn(
              "flex-1 flex flex-col justify-center py-8",
              runnerTab === 'map' ? 'flex' : 'hidden'
            )}>
              <div className="corner-card bg-[var(--color-bg-surface)] backdrop-blur-xl border border-white/5 relative">
                <div className="corner-tr" />
                <div className="p-5 border-b border-white/5">
                  <span className="label-technical text-[var(--color-accent)]">Sector Telemetry</span>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/80 mt-0.5">Sector 0{gameState!.round + 1} — Live Map</h3>
                </div>
                <div className="p-4">
                  <SectorMap
                    rounds={rounds}
                    currentRound={gameState!.round}
                    roundsDone={gameState!.roundsDone}
                    stage={gameState!.stage}
                    visible={runnerTab === 'map'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tactical Intel — shown when not on map tab */}
          <div className={cn(
            "flex-1 flex flex-col",
            role === 'runner' && runnerTab === 'map' && gameState!.stage !== 'complete' ? 'hidden' : 'flex'
          )}>
            <div className="flex-1 flex flex-col justify-center py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={gameState!.stage + gameState!.round}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  {!isMyTurn && gameState!.stage !== 'complete' ? (
                    <div className="corner-card glass-morphism p-16 text-center space-y-6">

                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 border border-[var(--color-accent)] animate-ping opacity-20" />
                        <div className="w-full h-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/40 flex items-center justify-center">
                          {role === 'solver' ? <MapPin className="text-[var(--color-accent)] animate-pulse" /> : <Shield className="text-[var(--color-accent)] animate-pulse" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-[var(--color-accent)] text-xl font-bold tracking-widest uppercase">AWAITING OPERATIVE</h2>
                        <p className="uppercase tracking-[0.1em] text-[10px] text-white/40">
                          Node 0{role === 'solver' ? '2' : '01'} is currently processing objective...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {gameState!.stage === 'p1_solve' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                          {/* Left: Problem Statement */}
                          <div className="corner-card glass-morphism relative p-8 h-full">

                            <div className="space-y-6">
                              <div className="flex flex-col gap-2">
                                <span className="label-technical text-[var(--color-accent)]">Mission Objective</span>
                                <h2 className="text-xl font-bold tracking-widest uppercase">{currentRound.p1.title}</h2>
                              </div>

                              {/* Problem Description */}
                              <div className="p-5 glass-morphism-inner space-y-3 custom-scrollbar overflow-y-auto max-h-[400px]">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="label-technical block text-white/40 uppercase tracking-widest text-[9px]">Problem Statement</span>
                                </div>
                                <p className="text-sm leading-relaxed text-white/90 font-mono whitespace-pre-wrap">
                                  {currentRound.p1.hint}
                                </p>
                              </div>

                            </div>
                          </div>

                          {/* Right: Code Editor + Console */}
                          <div className="space-y-4">
                            {/* File label */}
                            <div className="flex items-center justify-between px-1">
                              <span className="label-technical text-[var(--color-accent)]">Solution Editor</span>
                              {devMode && (
                                <button
                                  className="text-[9px] font-mono uppercase tracking-widest text-white/30 hover:text-[var(--color-accent)] transition-colors"
                                  onClick={() => setP1Code(currentRound.p1.ans)}
                                >
                                  [DEV: autofill]
                                </button>
                              )}
                            </div>

                            {/* Monaco Editor */}
                            <CodeEditor
                              value={p1Code || LANGUAGE_TEMPLATES[selectedLanguage]}
                              onChange={setP1Code}
                              language={selectedLanguage}
                              onLanguageChange={(lang, starter) => {
                                setSelectedLanguage(lang);
                                setP1Code(starter);
                                setConsoleOutput(null);
                              }}
                              onRun={(code) => runCode(code)}
                              height="340px"
                              defaultLanguage={(currentRound.p1.language ?? 'python') as SupportedLanguage}
                              defaultCode={currentRound.p1.code}
                            />

                            {/* Run Button */}
                            <Button
                              className="w-full font-bold uppercase tracking-[0.2em] h-14 btn-primary"
                              size="md"
                              onClick={() => runCode()}
                              disabled={isRunning || !p1Code.trim()}
                            >
                              {isRunning ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 border border-black/50 border-t-transparent rounded-full animate-spin" />
                                  EXECUTING...
                                </span>
                              ) : '▶  RUN CODE'}
                            </Button>

                            {/* Console Output */}
                            <div className="corner-card glass-morphism-dark p-5 min-h-[140px] flex flex-col">
                              <span className="label-technical mb-3 block text-[var(--color-accent)]/60">Execution Console</span>
                              <div className="font-mono text-[11px] flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {!consoleOutput && !isRunning && (
                                  <div className="text-white/20 flex items-center gap-2">
                                    <span className="w-1 h-3 bg-white/20 animate-pulse" />
                                    AWAITING EXECUTION...
                                  </div>
                                )}
                                {isRunning && (
                                  <div className="text-[var(--color-accent)]/60 flex items-center gap-2 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                                    Running on Piston sandbox...
                                  </div>
                                )}
                                {consoleOutput && (
                                  <>
                                    {consoleOutput.testResults && (
                                      <div className="mb-4 space-y-2">
                                        <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2 underline decoration-[var(--color-accent)]/20">Test Suite Execution</div>
                                        <div className="grid grid-cols-1 gap-1">
                                          {consoleOutput.testResults.map((tr, idx) => (
                                            <div key={idx} className={cn(
                                              "flex items-center justify-between p-2 rounded-sm font-mono text-[10px]",
                                              tr.passed ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20" : "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20"
                                            )}>
                                              <div className="flex items-center gap-2">
                                                <span className={tr.passed ? "text-[var(--color-accent)]" : "text-[var(--color-accent)]"}>
                                                  {tr.passed ? "●" : "×"}
                                                </span>
                                                <span className="text-white/60">CASE_{idx + 1}</span>
                                                <span className="text-white/20 whitespace-nowrap">INPUT: "{tr.input}"</span>
                                              </div>
                                              <div className="font-bold">
                                                {tr.passed ? (
                                                  <span className="text-[var(--color-accent)]">PASSED</span>
                                                ) : (
                                                  <span className="text-[var(--color-accent)]">FAILED</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {consoleOutput.matched && (
                                      <div className="text-[var(--color-accent)] font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        ALL TESTS PASSED — UPLOADING DATA...
                                      </div>
                                    )}
                                    {consoleOutput.stdout && (
                                      <div className="space-y-1">
                                        <div className="text-[9px] font-mono uppercase tracking-widest text-white/20">Standard Output (Last Case)</div>
                                        <pre className={cn('p-3 bg-[var(--color-bg-surface)] border border-white/5 text-[11px] whitespace-pre-wrap break-all', consoleOutput.matched ? 'text-[var(--color-accent)]/80' : 'text-white/70')}>{consoleOutput.stdout}</pre>
                                      </div>
                                    )}
                                    {consoleOutput.stderr && (
                                      <pre className="text-[var(--color-accent)]/80 text-[11px] whitespace-pre-wrap break-all mt-1">{consoleOutput.stderr}</pre>
                                    )}
                                    {!consoleOutput.matched && !consoleOutput.stderr && consoleOutput.stdout && (
                                      <div className="text-[var(--color-accent)] text-[10px] mt-2 uppercase tracking-widest">
                                        Verification Failed: Logic mismatch detected.
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* P1 Solved - Show coordinates */}
                      {gameState!.stage === 'p1_solved' && (
                        <div className="corner-card glass-morphism relative p-8 overflow-hidden">

                          <div className="space-y-6">
                            <div className="text-center">
                              <CheckCircle2 className="h-12 w-12 text-[var(--color-accent)] mx-auto mb-4" />
                              <h2 className="text-xl font-bold tracking-widest uppercase">Puzzle Solved!</h2>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest">Coordinates revealed for the Runner.</p>
                            </div>

                            <div className="space-y-4">
                              {/* Coordinates Card */}
                              <div className="corner-card glass-morphism p-4 relative">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[10px] font-bold text-[var(--color-accent)]/60 uppercase">Latitude</span>
                                    <div className="font-mono text-m text-white">{currentRound.coord.lat}</div>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-[var(--color-accent)]/60 uppercase">Longitude</span>
                                    <div className="font-mono text-m text-white">{currentRound.coord.lng}</div>
                                  </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-[var(--color-accent)]/20 flex items-start gap-3">
                                  <MapPin className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <div className="font-bold text-s uppercase tracking-wider">{currentRound.coord.place}</div>
                                    <div className="text-[10px] text-white/40 uppercase">Target: {currentRound.volunteer.name}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Passkey */}
                              <div className="corner-card glass-morphism p-4 text-center">
                                <div className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] mb-1">Passkey</div>
                                <div className="font-mono text-base sm:text-xl font-bold tracking-[0.22em] sm:tracking-[0.4em] text-white break-all">{currentRound.qrPasskey}</div>
                              </div>

                              <Button
                                className="w-full font-bold uppercase tracking-[0.2em] h-12"
                                variant="primary"
                                size="md"
                                onClick={handleSyncRunnerNode}
                                disabled={isSyncingRunner}
                              >
                                {isSyncingRunner ? (
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 border border-[var(--color-accent)]/50 border-t-transparent rounded-full animate-spin" />
                                    Synchronizing...
                                  </span>
                                ) : (
                                  'Synchronize Node 02'
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Runner Travel - Runner navigates to location */}
                      {gameState!.stage === 'runner_travel' && (
                        <div className="corner-card glass-morphism relative p-4 sm:p-6 overflow-hidden">

                          <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                              <Badge className="w-fit mb-1 bg-[var(--color-accent)]/10 text-white border border-white/20 text-[10px] uppercase text-xs">Round {gameState!.round + 1}</Badge>
                              <h2 className="text-lg font-bold tracking-widest uppercase">Travel to Location</h2>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">Find the volunteer at the coordinates below.</p>
                            </div>

                            <div className="space-y-3">
                              {gameState!.handoff && (
                                <div className="corner-card glass-morphism p-3 space-y-1.5 text-sm relative">
                                  <div className="corner-tr" />
                                  <div><span className="text-[10px] uppercase text-[var(--color-accent)]/60 font-bold mr-2">Volunteer:</span> {gameState!.handoff.volunteer}</div>
                                  <div className="flex items-center">
                                    <span className="text-[10px] uppercase text-[var(--color-accent)]/60 font-bold mr-2">Passkey:</span>
                                    <span className="font-mono text-white tracking-widest">{gameState!.handoff.passkey}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(gameState!.handoff!.passkey)}
                                      className="ml-auto p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-white"
                                      title="Copy Passkey"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div><span className="text-[10px] uppercase text-[var(--color-accent)]/60 font-bold mr-2">Target Node:</span> {gameState!.handoff.place}</div>
                                </div>
                              )}

                              {/* Coordinates */}
                              <div className="corner-card glass-morphism-dark grid grid-cols-2 gap-3 p-3">
                                <div>
                                  <span className="text-[10px] font-bold text-white/30 uppercase block mb-0.5">Latitude</span>
                                  <div className="font-mono text-sm text-white/80">{currentRound.coord.lat}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-white/30 uppercase block mb-0.5">Longitude</span>
                                  <div className="font-mono text-sm text-white/80">{currentRound.coord.lng}</div>
                                </div>
                              </div>

                              {/* Volunteer card */}
                              <div className="corner-card flex items-center gap-3 p-3 border border-white/20 transition-all duration-500 bg-black/40">
                                <div className="w-9 h-9 shrink-0 rounded-none border border-white/10 flex items-center justify-center font-bold text-sm text-[var(--color-accent)] bg-[var(--color-accent)]/10">
                                  {currentRound.volunteer.initials}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="font-bold text-base uppercase tracking-wider truncate text-white">
                                    {currentRound.volunteer.name}
                                  </div>
                                  <div className="text-[10px] text-white/60 uppercase tracking-widest font-mono truncate">
                                    {currentRound.coord.place}
                                  </div>
                                </div>
                              </div>

                              {/* Arrived — open passkey + minigame */}
                              <div className="pt-3 border-t border-white/5">
                                <Button className="w-full btn-primary h-12 text-[11px]" size="md" onClick={handleArrivedAtLocation} disabled={isEnteringRunnerGame}>
                                  {isEnteringRunnerGame ? (
                                    <span className="flex items-center gap-2">
                                      <span className="w-3 h-3 border border-black/50 border-t-transparent rounded-full animate-spin" />
                                      VERIFYING...
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <QrCode className="h-4 w-4 shrink-0" />
                                      <span>I'M AT THE LOCATION — ENTER PASSKEY</span>
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Runner Game - Passkey entry + Minigame */}
                      {(gameState!.stage === 'runner_game') && (
                        <RunnerGame
                          token={session!.token}
                          currentRoundIndex={gameState!.round}
                          totalRounds={rounds.length}
                          onRoundComplete={async () => {
                            // Allow the server's already-updated complete or p1_solve state to sync back down.
                            await sync();
                          }}
                        />
                      )}

                      {/* Final QR Handshake */}
                      {gameState!.stage === 'final_qr' && (
                        <div className="corner-card glass-morphism p-6 sm:p-8 relative text-center overflow-hidden">

                          <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                          <div className="relative z-10 space-y-6">
                            <div className="space-y-2">
                              <h2 className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-[var(--color-accent)]">Final Authentication</h2>
                              <p className="text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.15em] sm:tracking-[0.25em]">
                                {role === 'solver'
                                  ? 'Show this QR to the runner to finish the game.'
                                  : 'Scan solver QR to complete the quest.'}
                              </p>
                            </div>

                            {role === 'solver' ? (
                              <div className="space-y-4">
                                {finalQrLoading && (
                                  <div className="text-white/50 text-xs uppercase tracking-widest">Loading final QR...</div>
                                )}

                                {finalQrError && (
                                  <div className="flex justify-center">
                                    <TacticalStatus
                                      tone="error"
                                      label="Authentication Error"
                                      message={finalQrError}
                                      icon={AlertCircle}
                                    />
                                  </div>
                                )}

                                {!!finalQrImageUrl && (
                                  <div className="mx-auto w-fit p-3 sm:p-4 border border-white/20 bg-white">
                                    <img src={finalQrImageUrl} alt="Final completion QR code w-52 h-52 sm:w-72 sm:h-72 object-contain" />
                                  </div>
                                )}

                                {!!finalQrPayload && (
                                  <div className="text-[var(--color-accent)] font-mono text-xs sm:text-sm break-all tracking-[0.18em] sm:tracking-[0.25em]">
                                    {finalQrPayload}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <Button
                                  className="w-full font-bold uppercase tracking-[0.2em] h-14 btn-primary"
                                  size="md"
                                  onClick={() => setFinalQrScannerOpen(true)}
                                  disabled={isVerifyingFinalQr}
                                >
                                  {isVerifyingFinalQr ? (
                                    <span className="flex items-center gap-2">
                                      <span className="w-3 h-3 border border-black/50 border-t-transparent rounded-full animate-spin" />
                                      Verifying...
                                    </span>
                                  ) : (
                                    <>
                                      <QrCode className="mr-3 h-5 w-5" />
                                      Scan Solver Final QR
                                    </>
                                  )}
                                </Button>

                                {finalQrScannerOpen && (
                                  <div className="pt-2">
                                    <QRScanner
                                      onScan={handleVerifyFinalQr}
                                      onClose={() => setFinalQrScannerOpen(false)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Quest Complete */}
                      {gameState!.stage === 'complete' && (
                        <div className="corner-card glass-morphism bg-black/20 backdrop-blur-xl p-8 border border-white/20 relative text-center overflow-hidden">

                          <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                          <div className="relative z-10 space-y-8">
                            <div>
                              <Activity className="h-16 w-16 text-white fill-white/10 mx-auto mb-6 animate-pulse" />
                              <h2 className="text-3xl font-bold tracking-[0.3em] uppercase mb-2 text-white">Quest Complete</h2>
                              <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] sm:tracking-[0.4em]">All nodes synchronized. Protocol achieved.</p>
                            </div>

                            <div className="space-y-3">
                              {rounds.map((r: RoundQuestion, i: number) => (
                                <div key={i} className="corner-card glass-morphism flex items-center gap-3 p-4 bg-white/[0.02] border border-white/10 text-left relative group hover:border-white/30 transition-all">
                                  <div className="w-10 h-10 rounded-none border border-white/10 flex items-center justify-center text-xs font-bold bg-white/5 text-white">
                                    {r.volunteer.initials}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs font-bold uppercase tracking-widest text-white/80">Round {i + 1}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-tighter">{r.coord.place}</div>
                                  </div>
                                  <CheckCircle2 className="h-5 w-5 text-white" />
                                </div>
                              ))}
                            </div>

                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tactical Footer Watermark */}
            <div className="shrink-0 mt-auto pt-12 pb-6 opacity-20 pointer-events-none select-none">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[8px] uppercase tracking-[0.4em] font-mono text-center">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span>Operational Status: Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span>Secure Encryption: AES-256</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span>Terminal: {session?.team.name || 'GUEST'}-NODE-0{gameState?.round || 1}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Tactical Comms FAB - Outside main container for visibility */}
      {(role === 'solver' || role === 'runner') && session && (
        <button
          onClick={() => setIsCommsOpen(true)}
          className={cn(
            "fixed bottom-8 right-8 w-14 h-14 rounded-full z-[100] shadow-2xl transition-all duration-300 group overflow-hidden",
            "bg-black border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95",
            isCommsOpen ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
          )}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageSquare className="w-6 h-6 text-white group-hover:text-white/80 transition-colors" />

          {/* Notification ping */}
          {gameState?.lastMessage &&
            lastMessageNoticeRef.current !== 0 &&
            gameState.lastMessage.timestamp > lastMessageNoticeRef.current &&
            gameState.lastMessage.senderRole !== session.role && (
              <span className="absolute top-3 right-3 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-accent)]"></span>
              </span>
            )}
        </button>
      )}

      {/* Tactical Comms Modal */}
      {session && (role === 'solver' || role === 'runner') && (
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
      {/* Tactical Support Floating Widget */}
      {session && role && gameState?.stage !== 'complete' && (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 items-start pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={handleRequestHelp}
              disabled={helpCooldown > 0}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-2 bg-black/80 backdrop-blur-md border transition-all duration-300 overflow-hidden",
                helpCooldown > 0
                  ? "border-white/10 text-white/20 cursor-not-allowed grayscale"
                  : "border-red-500/40 text-red-500 hover:border-red-500 hover:bg-red-500/10 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
              )}
            >
              {/* Scanline effect for tactical feel */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent -translate-y-full group-hover:animate-[scan_2s_linear_infinite]" />

              <div className="relative flex items-center justify-center">
                <ShieldAlert className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  helpCooldown === 0 && "group-hover:scale-110"
                )} />
                {helpCooldown > 0 && (
                  <div className="absolute inset-0 border border-white/20 animate-spin rounded-full scale-150 opacity-20" />
                )}
              </div>

              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold tracking-widest uppercase leading-none">
                  {helpCooldown > 0 ? `SYNCING... ${helpCooldown}s` : 'REQUEST SUPPORT'}
                </span>
                <span className="text-[7px] opacity-60 font-medium tracking-[0.2em] uppercase mt-1">
                  Alert Mission Control
                </span>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-red-500/50" />
              <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-red-500/50" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
