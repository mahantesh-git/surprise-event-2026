import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  CheckCircle2,
  MapPin,
  QrCode,
  RefreshCw
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
import { getQuestions, compileCode, getFinalRoundQrCode, verifyRunnerFinalQr, RoundQuestion } from '@/lib/api';
import type { SupportedLanguage } from '@/components/CodeEditor';
import { CodeEditor, LANGUAGE_TEMPLATES } from '@/components/CodeEditor';
import { PersistentProgress } from '@/components/PersistentProgress';
import { SectorMap } from '@/components/SectorMap';
import { RunnerGame } from '@/components/RunnerGame';
import { Leaderboard } from '@/components/Leaderboard';
import { QRScanner } from '@/components/QRScanner';

const SOLVER_FULLSCREEN_EXIT_KEY = import.meta.env.VITE_SOLVER_EXIT_KEY || 'quest-exit';

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const role = pathname === '/solver' || pathname === '/runner' ? (pathname.slice(1) as Role) : null;
  const { session, gameState, loading, login, logout, resetGame, updateState, sync } = useGameState((role ?? 'solver') as Role);
  const [rounds, setRounds] = useState<RoundQuestion[]>([]);
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
  const [consoleOutput, setConsoleOutput] = useState<{
    stdout: string;
    stderr: string;
    matched: boolean;
    testResults?: Array<{ input: string; passed: boolean; stdout: string; stderr: string }>
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err', msg: string } | null>(null);
  const [notification, setNotification] = useState<{ id: number; message: string; tone: 'info' | 'success' } | null>(null);
  const [showFullscreenExitGate, setShowFullscreenExitGate] = useState(false);
  const [fullscreenExitKeyInput, setFullscreenExitKeyInput] = useState('');
  const [fullscreenExitError, setFullscreenExitError] = useState<string | null>(null);
  const [reenteringFullscreen, setReenteringFullscreen] = useState(false);

  const [devMode, setDevMode] = useState(false);
  const previousRoundStateRef = useRef<number | null>(null);
  const lastRunnerHandoffNoticeRef = useRef<string>('');
  const lastSolverCompleteNoticeRef = useRef(false);
  const notificationTimerRef = useRef<number | null>(null);
  const solverExitAuthorizedRef = useRef(false);
  const wasFullscreenRef = useRef(false);

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

  // Stream runner GPS to backend while in field stages
  useRunnerGps(
    role === 'runner' ? (session?.token ?? null) : null,
    role === 'runner' ? (gameState?.stage ?? null) : null
  );

  // Sync top-level location changes on popstate
  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!role) return;

    setRoundsLoading(true);
    getQuestions()
      .then((response: any) => {
        const questionsArray = response?.questions || (Array.isArray(response) ? response : []);
        const sorted = [...questionsArray].sort((a: RoundQuestion, b: RoundQuestion) => (a.round || 0) - (b.round || 0));
        setRounds(sorted);
        setRoundsError(null);
      })
      .catch((error: Error) => {
        setRounds(prev => prev.length > 0 ? prev : []);
        setRoundsError(error instanceof Error ? error.message : 'Failed to load questions');
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

    pushNotification('Runner final step: scan the solver finish QR to complete the quest.');
  }, [gameState?.stage, role, session?.token]);

  const pushNotification = (message: string, tone: 'info' | 'success' = 'info') => {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }

    setNotification({ id: Date.now(), message, tone });
    notificationTimerRef.current = window.setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
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
  }, [gameState, role, session]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        window.clearTimeout(notificationTimerRef.current);
      }
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
      <AdminPanel
        onBack={() => {
          window.history.pushState({}, '', '/');
          setPathname('/');
        }}
      />
    );
  }

  if (!role) {
    return (
      <RoleSelection
        onSelect={(selectedRole: Role) => {
          const nextPath = `/${selectedRole}`;
          window.history.pushState({}, '', nextPath);
          setPathname(nextPath);
        }}
      />
    );
  }

  if (loading || roundsLoading) return <div className="min-h-screen flex items-center justify-center text-white bg-[var(--color-bg-surface)]"><Zap className="animate-pulse text-[var(--color-accent)]" /></div>;

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setLoginError(null);
    setIsLoggingIn(true);
    try {
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

  const handleLogout = () => {
    logout();
    setPassword('');
    setLoginError(null);
  };

  if (!session) {
    return (
      <>
        <GridBackground />

        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 relative z-10 text-white bg-[var(--color-bg-void)] reveal-up">
          <div className="corner-card w-full max-w-md bg-[var(--color-bg-surface)] backdrop-blur-xl p-8 border border-white/5">

            <CardHeader className="border-b-0 pb-0">
              <div className="text-center space-y-6 mb-8 pt-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 fill-[var(--color-accent)] text-[var(--color-accent)] animate-pulse" />
                    <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--color-accent)] uppercase">Authorized Access Only</span>
                  </div>
                  <h1 className="text-5xl font-bold uppercase tracking-tighter font-space-grotesk leading-none">
                    <span className="text-white/20 line-through decoration-[var(--color-accent)] decoration-[4px]">QUEST</span><br />
                    <span className="text-white">LOGIN</span>
                  </h1>
                </div>
                <div className="inline-flex items-center gap-2 border border-white/5 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Role: {role}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                placeholder="TEAM_NAME"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                className="w-full high-clearance-input text-center h-14"
                autoComplete="off"
                spellCheck="false"
                disabled={isLoggingIn}
              />
              <input
                placeholder="ACCESS_PASSWORD"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !isLoggingIn && handleLogin()}
                className="w-full high-clearance-input text-center h-14"
                autoComplete="off"
                disabled={isLoggingIn}
              />
              {loginError && (
                <div className="p-3 border border-rose-600/50 bg-rose-600/10 text-rose-400 text-[10px] uppercase tracking-widest text-center font-mono">
                  {loginError}
                </div>
              )}
              <Button
                className="w-full font-bold uppercase tracking-[0.2em] h-14 mt-4 btn-primary"
                size="md"
                onClick={handleLogin}
                disabled={isLoggingIn || !teamName.trim() || !password.trim()}
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-black/50 border-t-transparent rounded-full animate-spin" />
                    CONNECTING...
                  </span>
                ) : (
                  'Establish Connection'
                )}
              </Button>
              <p className="text-[10px] font-mono text-center text-white/30 leading-relaxed uppercase tracking-tighter pt-4">
                Protocol: Secure Auth / Node: 0{role === 'solver' ? '1' : '2'}
              </p>
            </CardContent>
          </div>
        </div>
      </>
    );
  }

  if (roundsError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 text-white bg-[var(--color-bg-surface)] reveal-up">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Unable to load questions</CardTitle>
            <CardDescription>{roundsError}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 text-white bg-[var(--color-bg-surface)] reveal-up">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No questions configured</CardTitle>
            <CardDescription>Ask admin to add at least one round in the admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
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

  const runCode = async () => {
    if (!session?.token || !p1Code.trim() || isRunning) return;
    setIsRunning(true);
    setConsoleOutput(null);
    try {
      const result = await compileCode(session.token, currentRound.id, p1Code, selectedLanguage);

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
    if (!session?.token || isVerifyingFinalQr) return;

    setIsVerifyingFinalQr(true);
    try {
      await verifyRunnerFinalQr(session.token, decodedValue.trim());
      setFinalQrScannerOpen(false);
      await sync();
    } catch (error) {
      pushNotification(error instanceof Error ? error.message : 'Final QR verification failed');
    } finally {
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
                  <div className="p-2 border border-rose-600/40 bg-rose-600/10 text-rose-400 text-[10px] uppercase tracking-widest text-center">
                    {fullscreenExitError}
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

      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -60, scaleX: 0.6, scaleY: 0.4, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -60, scaleX: 0.6, scaleY: 0.4, filter: 'blur(4px)' }}
            transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
            className={cn(
              'fixed top-[70px] sm:top-[84px] left-1/2 -translate-x-1/2 z-[40] w-[calc(100%-2rem)] sm:w-auto sm:min-w-[320px] max-w-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-3xl border',
              notification.tone === 'success'
                ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-void)]/90 border-white/10 text-white'
            )}
          >
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                notification.tone === 'success' ? "bg-[var(--color-accent)]/20" : "bg-white/10"
              )}>
                {notification.tone === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                ) : (
                  <Zap className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60">
                  {notification.tone === 'success' ? 'System Success' : 'System Notice'}
                </p>
                <p className="text-xs sm:text-sm font-medium tracking-wide leading-snug">
                  {notification.message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PersistentProgress totalRounds={rounds.length} currentRound={gameState?.round ?? 0} roundsDone={gameState?.roundsDone ?? []} />
      <GridBackground />
      <Navbar
        brandName="QUEST"
        ctaText="SYSTEM"
        metaText={role?.toUpperCase()}
        onMenuOpen={() => { }}
        startTime={gameState?.startTime}
        finishTime={gameState?.finishTime}
      />

      <div className="min-h-screen pt-16 pb-8 px-4 sm:px-6 relative z-10 text-white bg-[var(--color-bg-void)] reveal-up overflow-x-hidden">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6 mt-2 sm:mt-4">
            <div className="flex flex-row items-end justify-between border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3 w-3 text-[var(--color-accent)] fill-[var(--color-accent)]" />
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

          {/* Main Content */}
          <AnimatePresence mode="wait">
            <motion.div key={gameState!.stage + gameState!.round} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {!isMyTurn && gameState!.stage !== 'complete' ? (
                <div className="corner-card border-white/10 bg-[var(--color-bg-surface)]/60 backdrop-blur-2xl p-16 text-center space-y-6">

                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border border-[var(--color-accent)] animate-ping opacity-20" />
                    <div className="w-full h-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/40 flex items-center justify-center">
                      {role === 'solver' ? <MapPin className="text-[var(--color-accent)] animate-pulse" /> : <Zap className="text-[var(--color-accent)] animate-pulse" />}
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
                      <div className="corner-card backdrop-blur-xl relative p-8 h-full">

                        <div className="space-y-6">
                          <div className="flex flex-col gap-2">
                            <span className="label-technical text-[var(--color-accent)]">Mission Objective</span>
                            <h2 className="text-xl font-bold tracking-widest uppercase">{currentRound.p1.title}</h2>
                          </div>

                          {/* Problem Description */}
                          <div className="p-4 border border-white/10 bg-[var(--color-accent-fill)] space-y-2">
                            <div className="flex justify-between items-center mb-2">
                              <span className="label-technical block text-white/40 uppercase">Problem Statement</span>
                            </div>
                            <p className="text-sm leading-relaxed text-white/70 font-mono whitespace-pre-wrap">
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
                          onRun={runCode}
                          height="340px"
                          defaultLanguage={(currentRound.p1.language ?? 'python') as SupportedLanguage}
                          defaultCode={currentRound.p1.code}
                        />

                        {/* Run Button */}
                        <Button
                          className="w-full font-bold uppercase tracking-[0.2em] h-14 btn-primary"
                          size="md"
                          onClick={runCode}
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
                        <div className="corner-card bg-[var(--color-bg-surface)] border-white/5 p-5 min-h-[140px] flex flex-col">
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
                                          tr.passed ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20" : "bg-rose-500/10 border border-rose-500/20"
                                        )}>
                                          <div className="flex items-center gap-2">
                                            <span className={tr.passed ? "text-[var(--color-accent)]" : "text-rose-500"}>
                                              {tr.passed ? "●" : "×"}
                                            </span>
                                            <span className="text-white/60">CASE_{idx + 1}</span>
                                            <span className="text-white/20 whitespace-nowrap">INPUT: "{tr.input}"</span>
                                          </div>
                                          <div className="font-bold">
                                            {tr.passed ? (
                                              <span className="text-[var(--color-accent)]">PASSED</span>
                                            ) : (
                                              <span className="text-rose-500">FAILED</span>
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
                                  <pre className="text-rose-400 text-[11px] whitespace-pre-wrap break-all mt-1">{consoleOutput.stderr}</pre>
                                )}
                                {!consoleOutput.matched && !consoleOutput.stderr && consoleOutput.stdout && (
                                  <div className="text-rose-400 text-[10px] mt-2 uppercase tracking-widest">
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
                    <div className="corner-card bg-[var(--color-bg-surface)]/80 backdrop-blur-2xl relative p-8 overflow-hidden">

                      <div className="space-y-6">
                        <div className="text-center">
                          <CheckCircle2 className="h-12 w-12 text-[var(--color-accent)] mx-auto mb-4" />
                          <h2 className="text-xl font-bold tracking-widest uppercase">Puzzle Solved!</h2>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">Coordinates revealed for the Runner.</p>
                        </div>

                        <div className="space-y-4">
                          {/* Coordinates Card */}
                          <div className="corner-card bg-white/[0.03] border border-white/10 p-4 relative">
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
                          <div className="corner-card bg-white/[0.05] border border-[var(--color-accent)]/40 p-4 text-center">
                            <div className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] mb-1">Passkey</div>
                            <div className="font-mono text-base sm:text-xl font-bold tracking-[0.22em] sm:tracking-[0.4em] text-white break-all">{currentRound.qrPasskey}</div>
                          </div>

                          <Button
                            className="w-full font-bold uppercase tracking-[0.2em] h-12"
                            variant="emerald"
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
                    <div className="corner-card bg-[var(--color-bg-surface)] backdrop-blur-xl relative p-4 sm:p-6 overflow-hidden">

                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <Badge className="w-fit mb-1 bg-[var(--color-accent)]/10 text-white border border-[var(--color-accent)] text-[10px] uppercase">Round {gameState!.round + 1}</Badge>
                          <h2 className="text-lg font-bold tracking-widest uppercase">Travel to Location</h2>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">Find the volunteer at the coordinates below.</p>
                        </div>

                        <div className="space-y-3">
                          {gameState!.handoff && (
                            <div className="corner-card border-white/10 bg-white/[0.03] p-3 space-y-1.5 text-sm relative">
                              <div className="corner-tr" />
                              <div><span className="text-[10px] uppercase text-[var(--color-accent)]/60 font-bold mr-2">Volunteer:</span> {gameState!.handoff.volunteer}</div>
                              <div><span className="text-[10px] uppercase text-[var(--color-accent)]/60 font-bold mr-2">Passkey:</span> <span className="font-mono text-white tracking-widest">{gameState!.handoff.passkey}</span></div>
                              <div><span className="text-[10px] uppercase text-[var(--color-accent)]/60 font-bold mr-2">Target Node:</span> {gameState!.handoff.place}</div>
                            </div>
                          )}

                          {/* Coordinates */}
                          <div className="corner-card bg-[var(--color-bg-void)] grid grid-cols-2 gap-3 p-3 border border-white/5">
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
                          <div className={cn("corner-card flex items-center gap-3 p-3 border border-white/5 transition-all duration-500", currentRound.volunteer.bg)}>
                            <div className={cn("w-9 h-9 shrink-0 rounded-none border border-white/10 flex items-center justify-center font-bold text-sm", currentRound.volunteer.color)}>
                              {currentRound.volunteer.initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className={cn("font-bold text-base uppercase tracking-wider truncate", currentRound.volunteer.color)}>
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
                    <div className="corner-card bg-[var(--color-bg-surface)] backdrop-blur-xl p-6 sm:p-8 border border-[var(--color-accent)]/30 relative text-center overflow-hidden">

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
                              <div className="p-3 border border-rose-600/40 bg-rose-600/10 text-rose-400 text-[10px] uppercase tracking-widest">
                                {finalQrError}
                              </div>
                            )}

                            {!!finalQrImageUrl && (
                              <div className="mx-auto w-fit p-3 sm:p-4 border border-[var(--color-accent)]/40 bg-white">
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
                    <div className="corner-card bg-[var(--color-bg-surface)] backdrop-blur-xl p-8 border border-[var(--color-accent)]/30 relative text-center overflow-hidden">

                      <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                      <div className="relative z-10 space-y-8">
                        <div>
                          <Zap className="h-16 w-16 text-[var(--color-accent)] fill-[var(--color-accent)] mx-auto mb-6 animate-pulse" />
                          <h2 className="text-3xl font-bold tracking-[0.3em] uppercase mb-2 text-[var(--color-accent)]">Quest Complete</h2>
                          <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] sm:tracking-[0.4em]">All nodes synchronized. Protocol achieved.</p>
                        </div>

                        <div className="space-y-3">
                          {rounds.map((r: RoundQuestion, i: number) => (
                            <div key={i} className="corner-card flex items-center gap-3 p-4 bg-white/5 border border-white/5 text-left relative group hover:border-[var(--color-accent)]/30 transition-all">
                              <div className={cn("w-10 h-10 rounded-none border border-white/10 flex items-center justify-center text-xs font-bold", r.volunteer.bg, r.volunteer.color)}>
                                {r.volunteer.initials}
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]/80">Round {i + 1}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-tighter">{r.coord.place}</div>
                              </div>
                              <CheckCircle2 className="h-5 w-5 text-[var(--color-accent)]" />
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

          {/* Game Map */}
          {role !== 'solver' && (
            <div className="mt-[var(--svh-md)]">
              <div className="corner-card bg-[var(--color-bg-surface)] backdrop-blur-xl border border-white/5 relative">
                <div className="corner-tr" />
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <div>
                    <span className="label-technical text-[var(--color-accent)]">Sector Telemetry</span>
                    <h3 className="text-m font-bold uppercase tracking-widest text-white/80">{gameState!.stage === 'complete' ? "Deployment Finished" : `Sector 0${gameState!.round + 1}`}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <SectorMap
                    rounds={rounds}
                    currentRound={gameState!.round}
                    roundsDone={gameState!.roundsDone}
                    stage={gameState!.stage}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
