import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, 
  MapPin, 
  QrCode, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle, 
  RefreshCw,
  Navigation,
  Zap,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QRScanner } from '@/components/QRScanner';
import { AdminPanel } from '@/components/AdminPanel';
import { RoleSelection } from '@/components/RoleSelection';
import { useGameState, type Role } from '@/hooks/useGameState';
import { getQuestions, type RoundQuestion } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const role = pathname === '/solver' || pathname === '/runner' ? (pathname.slice(1) as Role) : null;
  const { session, gameState, loading, login, logout, resetGame, updateState } = useGameState((role ?? 'solver') as Role);
  const [rounds, setRounds] = useState<RoundQuestion[]>([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err', msg: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devMode, setDevMode] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!gameState || !canvasRef.current || rounds.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    rounds.forEach((r, i) => {
      const x = r.cx * W;
      const y = r.cy * H;
      const isDone = gameState.roundsDone[i];
      const isActive = i === gameState.round && gameState.stage !== 'complete';
      const isP2Stage = isActive && ['p2_travel', 'p2_scan', 'p2_solve', 'p2_solved'].includes(gameState.stage);

      if (i > 0 && gameState.roundsDone[i-1]) {
        const prev = rounds[i-1];
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(prev.cx * W, prev.cy * H);
        ctx.lineTo(x, y);
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(x, y, isDone ? 10 : 8, 0, Math.PI * 2);
      if (isDone) ctx.fillStyle = '#10b981';
      else if (isActive) ctx.fillStyle = isP2Stage ? '#10b981' : '#3b82f6';
      else ctx.fillStyle = isDark ? '#3f3f46' : '#d4d4d8';
      ctx.fill();

      if (isActive) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = isP2Stage ? '#10b981' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(r.coord.place.split(',')[0], x, y + 24);
    });
  }, [gameState, rounds]);

  useEffect(() => {
    if (!role) return;

    setRoundsLoading(true);
    getQuestions()
      .then((response) => {
        const sorted = response.questions.slice().sort((a, b) => a.round - b.round);
        setRounds(sorted);
        setRoundsError(null);
      })
      .catch((error) => {
        setRoundsError(error instanceof Error ? error.message : 'Failed to load questions');
      })
      .finally(() => setRoundsLoading(false));
  }, [role, session?.team.id]);

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
        onSelect={(selectedRole) => {
          const nextPath = `/${selectedRole}`;
          window.history.pushState({}, '', nextPath);
          setPathname(nextPath);
        }}
      />
    );
  }

  if (loading || roundsLoading) return <div className="min-h-screen flex items-center justify-center"><Zap className="animate-pulse text-amber-500" /></div>;

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await login(teamName, password);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleLogout = () => {
    logout();
    setPassword('');
    setLoginError(null);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <Card className="max-w-md w-full p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Zap className={`h-8 w-8 fill-amber-500 ${role === 'solver' ? 'text-blue-500' : 'text-emerald-500'}`} />
              <h1 className="text-3xl font-bold tracking-tight">QUEST</h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 capitalize">{role} team login</p>
          </div>
          <div className="space-y-3">
            <Input placeholder="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleLogin()} />
            {loginError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loginError}</div>}
            <Button className={`w-full ${role === 'solver' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`} onClick={handleLogin}>Log in</Button>
          </div>
          <p className="text-xs text-center text-zinc-400">
            Team data stays isolated per team. No registration is available.
          </p>
        </Card>
      </div>
    );
  }

  if (roundsError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
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

  const checkP1 = () => {
    if (p1Input.trim().toLowerCase() === currentRound.p1.ans.toLowerCase()) {
      setFeedback({ type: 'ok', msg: `Correct! ${currentRound.p1.output}` });
      setTimeout(() => {
        updateState({ stage: 'p1_solved' });
        setFeedback(null);
        setP1Input('');
        setShowHint(false);
      }, 1000);
    } else setFeedback({ type: 'err', msg: 'Incorrect. Try again!' });
  };

  const checkP2 = () => {
    if (p2Input.trim().toLowerCase() === currentRound.p2.ans.toLowerCase()) {
      setFeedback({ type: 'ok', msg: `Correct! ${currentRound.p2.output}` });
      const newRoundsDone = [...gameState!.roundsDone];
      newRoundsDone[gameState!.round] = true;
      setTimeout(() => {
        updateState({ roundsDone: newRoundsDone, stage: 'p2_solved' });
        setFeedback(null);
        setP2Input('');
        setShowHint(false);
      }, 1000);
    } else setFeedback({ type: 'err', msg: 'Incorrect. Try again!' });
  };

  const handleQRScan = (text: string) => {
    if (text.toUpperCase().includes(currentRound.qrPasskey.toUpperCase())) {
      setIsScanning(false);
      updateState({ stage: 'p2_solve' });
    }
  };

  const checkQRPasskey = () => {
    if (qrInput.trim().toUpperCase() === currentRound.qrPasskey.toUpperCase()) {
      updateState({ stage: 'p2_solve' });
      setQrInput('');
    } else setFeedback({ type: 'err', msg: 'Invalid passkey.' });
  };

  const nextRound = () => {
    if (gameState!.round < rounds.length - 1) {
      updateState({ round: gameState!.round + 1, stage: 'p1_solve', handoff: null });
    } else updateState({ stage: 'complete' });
  };

  const reset = async () => {
    await resetGame();
    setFeedback(null);
    setP1Input('');
    setP2Input('');
    setQrInput('');
    setShowHint(false);
  };

  const isMyTurn = (role === 'solver' && ['p1_solve', 'p1_solved'].includes(gameState!.stage)) ||
                   (role === 'runner' && ['p2_travel', 'p2_scan', 'p2_solve', 'p2_solved'].includes(gameState!.stage));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
              <h1 className="text-xl font-bold tracking-tight">QUEST</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{role}</Badge>
              <span className="text-xs text-zinc-500 hidden sm:inline">{session.team.name}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-1 px-1">
            {rounds.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", 
                gameState!.roundsDone[i] ? "bg-emerald-500" : (i === gameState!.round ? "bg-blue-500 animate-pulse" : "bg-zinc-200 dark:bg-zinc-800"))} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div key="scanner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <QRScanner onScan={handleQRScan} onClose={() => setIsScanning(false)} />
            </motion.div>
          ) : (
            <motion.div key={gameState!.stage + gameState!.round} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {!isMyTurn && gameState!.stage !== 'complete' ? (
                <Card className="text-center p-12 space-y-4">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    {role === 'solver' ? <Navigation className="text-zinc-400" /> : <Code2 className="text-zinc-400" />}
                  </div>
                  <CardTitle>Waiting for {role === 'solver' ? 'Runner' : 'Solver'}</CardTitle>
                  <CardDescription>The other player is currently completing their task.</CardDescription>
                </Card>
              ) : (
                <>
                  {gameState!.stage === 'p1_solve' && (
                    <Card className="border-blue-100 dark:border-blue-900/30">
                      <CardHeader>
                        <Badge className="w-fit mb-2 bg-blue-100 text-blue-700">Round {gameState!.round + 1}</Badge>
                        <CardTitle>{currentRound.p1.title}</CardTitle>
                        <CardDescription>Solve this code puzzle to reveal the next location.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-sm leading-relaxed">
                          {currentRound.p1.code.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-zinc-500 uppercase">Output</label>
                            <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)}>{showHint ? "Hide Hint" : "Show Hint"}</Button>
                          </div>
                          {showHint && <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-md mb-2">{currentRound.p1.hint}</div>}
                          <Input placeholder="Type answer..." className="font-mono" value={p1Input} onChange={(e) => setP1Input(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkP1()} />
                        </div>
                        {feedback && <div className={cn("p-3 rounded-md text-sm font-medium", feedback.type === 'ok' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{feedback.msg}</div>}
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-blue-600 text-white" onClick={checkP1}>Compile & Run</Button>
                          {devMode && <Button variant="outline" size="icon" onClick={() => setP1Input(currentRound.p1.ans)}><Zap className="h-4 w-4" /></Button>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {gameState!.stage === 'p1_solved' && (
                    <Card className="border-emerald-100 dark:border-emerald-900/30">
                      <CardHeader className="text-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                        <CardTitle>Puzzle Solved!</CardTitle>
                        <CardDescription>Coordinates revealed for the Runner.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-[10px] font-bold text-zinc-400 uppercase">Lat</span><div className="font-mono">{currentRound.coord.lat}</div></div>
                            <div><span className="text-[10px] font-bold text-zinc-400 uppercase">Lng</span><div className="font-mono">{currentRound.coord.lng}</div></div>
                          </div>
                          <div className="pt-2 border-t border-zinc-200 flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                            <div><div className="font-semibold text-sm">{currentRound.coord.place}</div><div className="text-xs text-zinc-500">Find {currentRound.volunteer.name}</div></div>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">Passkey</div>
                            <div className="font-mono text-lg font-bold tracking-[0.2em] text-blue-700">{currentRound.qrPasskey}</div>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-emerald-600 text-white"
                          onClick={() => updateState({
                            stage: 'p2_travel',
                            handoff: {
                              passkey: currentRound.qrPasskey,
                              lat: currentRound.coord.lat,
                              lng: currentRound.coord.lng,
                              volunteer: currentRound.volunteer.name,
                              place: currentRound.coord.place,
                            },
                          })}
                        >
                          Confirm Hand-off
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {gameState!.stage === 'p2_travel' && (
                    <Card className="border-emerald-100 dark:border-emerald-900/30">
                      <CardHeader>
                        <Badge className="w-fit mb-2 bg-emerald-100 text-emerald-700">Round {gameState!.round + 1}</Badge>
                        <CardTitle>Travel to Location</CardTitle>
                        <CardDescription>Find the volunteer at the coordinates.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {gameState!.handoff && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                            <div className="text-[10px] font-bold uppercase text-emerald-600">Hand-off Details</div>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div><span className="font-semibold">Volunteer:</span> {gameState!.handoff.volunteer}</div>
                              <div><span className="font-semibold">Passkey:</span> {gameState!.handoff.passkey}</div>
                              <div><span className="font-semibold">Lat:</span> {gameState!.handoff.lat}</div>
                              <div><span className="font-semibold">Lng:</span> {gameState!.handoff.lng}</div>
                              <div><span className="font-semibold">Place:</span> {gameState!.handoff.place}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg", currentRound.volunteer.bg, currentRound.volunteer.color)}>{currentRound.volunteer.initials}</div>
                          <div><div className="font-bold">{currentRound.volunteer.name}</div><div className="text-xs text-zinc-500">{currentRound.coord.place}</div></div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl grid grid-cols-2 gap-4">
                          <div><span className="text-[10px] font-bold text-zinc-400 uppercase">Lat</span><div className="font-mono">{currentRound.coord.lat}</div></div>
                          <div><span className="text-[10px] font-bold text-zinc-400 uppercase">Lng</span><div className="font-mono">{currentRound.coord.lng}</div></div>
                        </div>
                        <div className="space-y-3">
                          <Button className="w-full bg-emerald-600 text-white h-12" onClick={() => setIsScanning(true)}><QrCode className="mr-2 h-5 w-5" />Scan QR Code</Button>
                          {devMode && <Button variant="outline" className="w-full" onClick={() => updateState({ stage: 'p2_scan' })}>Manual Entry</Button>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {gameState!.stage === 'p2_scan' && (
                    <Card>
                      <CardHeader><CardTitle>Enter Passkey</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <Input placeholder="Passkey..." className="font-mono uppercase tracking-widest" value={qrInput} onChange={(e) => setQrInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkQRPasskey()} />
                        {feedback && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">{feedback.msg}</div>}
                        <Button className="w-full bg-emerald-600 text-white" onClick={checkQRPasskey}>Unlock Puzzle</Button>
                      </CardContent>
                    </Card>
                  )}

                  {gameState!.stage === 'p2_solve' && (
                    <Card className="border-emerald-100 dark:border-emerald-900/30">
                      <CardHeader>
                        <Badge className="w-fit mb-2 bg-emerald-100 text-emerald-700">Round {gameState!.round + 1}</Badge>
                        <CardTitle>{currentRound.p2.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-sm leading-relaxed">
                          {currentRound.p2.code.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-zinc-500 uppercase">Output</label>
                            <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)}>{showHint ? "Hide Hint" : "Show Hint"}</Button>
                          </div>
                          {showHint && <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-md mb-2">{currentRound.p2.hint}</div>}
                          <Input placeholder="Type answer..." className="font-mono" value={p2Input} onChange={(e) => setP2Input(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkP2()} />
                        </div>
                        {feedback && <div className={cn("p-3 rounded-md text-sm font-medium", feedback.type === 'ok' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{feedback.msg}</div>}
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-emerald-600 text-white" onClick={checkP2}>Submit Answer</Button>
                          {devMode && <Button variant="outline" size="icon" onClick={() => setP2Input(currentRound.p2.ans)}><Zap className="h-4 w-4" /></Button>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {gameState!.stage === 'p2_solved' && (
                    <Card className="border-emerald-100 dark:border-emerald-900/30 text-center">
                      <CardHeader>
                        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                        <CardTitle>Round {gameState!.round + 1} Complete!</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Button className="w-full bg-zinc-900 text-white" onClick={nextRound}>{gameState!.round < rounds.length - 1 ? "Next Round" : "Finish Quest"}<ChevronRight className="ml-2 h-4 w-4" /></Button>
                      </CardContent>
                    </Card>
                  )}

                  {gameState!.stage === 'complete' && (
                    <Card className="border-amber-100 dark:border-amber-900/30 text-center">
                      <CardHeader>
                        <Zap className="h-12 w-12 text-amber-600 fill-amber-600 mx-auto mb-4" />
                        <CardTitle className="text-2xl">Quest Complete!</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          {rounds.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", r.volunteer.bg, r.volunteer.color)}>{r.volunteer.initials}</div>
                              <div className="flex-1 text-left"><div className="text-sm font-bold">Round {i + 1}</div><div className="text-[10px] text-zinc-500 uppercase">{r.coord.place}</div></div>
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" className="w-full" onClick={reset}><RefreshCw className="mr-2 h-4 w-4" />Play Again</Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8">
          <Card className="overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-none shadow-none">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase text-zinc-400">Map</CardTitle>
                <CardDescription className="text-[10px]">{gameState!.stage === 'complete' ? "Finished" : `Round ${gameState!.round + 1}`}</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-zinc-500">P1</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-zinc-500">P2</span></div>
              </div>
            </CardHeader>
            <div className="px-6 pb-6">
              <canvas ref={canvasRef} className="w-full h-[180px] rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
