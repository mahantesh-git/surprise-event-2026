import React, { useState, useEffect } from 'react';
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
import { getQuestions, compilePython, RoundQuestion } from '@/lib/api';
import { PersistentProgress } from '@/components/PersistentProgress';
import { SectorMap } from '@/components/SectorMap';
import { RunnerGame } from '@/components/RunnerGame';
import { Leaderboard } from '@/components/Leaderboard';
import { highlightCode } from '@/lib/syntax';

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
  const [p1Input, setP1Input] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err', msg: string } | null>(null);
  const [devMode, setDevMode] = useState(false);

  // Stream runner GPS to backend while in field stages
  useRunnerGps(
    role === 'runner' ? (session?.token ?? null) : null,
    role === 'runner' ? (gameState?.stage ?? null) : null
  );

  // Use sync scroll for code/trace if needed in future

  useEffect(() => {
    if (!role) return;

    setRoundsLoading(true);
    getQuestions()
      .then((response: { questions: RoundQuestion[] }) => {
        const sorted = response.questions.slice().sort((a: RoundQuestion, b: RoundQuestion) => a.round - b.round);
        setRounds(sorted);
        setRoundsError(null);
      })
      .catch((error: Error) => {
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
        onSelect={(selectedRole: Role) => {
          const nextPath = `/${selectedRole}`;
          window.history.pushState({}, '', nextPath);
          setPathname(nextPath);
        }}
      />
    );
  }

  if (loading || roundsLoading) return <div className="min-h-screen flex items-center justify-center text-white bg-[#0B0C0D]"><Zap className="animate-pulse text-[#95FF00]" /></div>;

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
      <>
        <GridBackground />
        <Navbar brandName="QUEST" ctaText="Admin" onMenuOpen={() => {
          window.history.pushState({}, '', '/admin');
          setPathname('/admin');
        }} />
        
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 relative z-10 text-white bg-[#15171A] reveal-up">
          <div className="corner-card w-full max-w-md bg-black/40 backdrop-blur-xl p-8 border border-white/5">
            <div className="corner-br" /> <div className="corner-bl" />
            <CardHeader className="border-b-0 pb-0">
              <div className="text-center space-y-6 mb-8 pt-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 fill-[#95FF00] text-[#95FF00] animate-pulse" />
                    <span className="font-mono text-[10px] tracking-[0.3em] text-[#95FF00] uppercase">Authorized Access Only</span>
                  </div>
                  <h1 className="text-5xl font-bold uppercase tracking-tighter font-space-grotesk leading-none">
                    <span className="text-white/20 line-through decoration-[#95FF00] decoration-[4px]">QUEST</span><br/>
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
              />
              <input 
                placeholder="ACCESS_PASSWORD" 
                type="password" 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
                className="w-full high-clearance-input text-center h-14"
                autoComplete="off"
              />
              {loginError && (
                <div className="p-3 border border-rose-600/50 bg-rose-600/10 text-rose-400 text-[10px] uppercase tracking-widest text-center font-mono">
                  {loginError}
                </div>
              )}
              <Button 
                className="w-full font-bold uppercase tracking-[0.2em] h-14 mt-4"
                variant="sage"
                size="md"
                onClick={handleLogin}
              >
                Establish Connection
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
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 text-white bg-[#0B0C0D] reveal-up">
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
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 text-white bg-[#0B0C0D] reveal-up">
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

  const normalizeAnswer = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

  const checkP1 = async () => {
    if (!session?.token) return;

    try {
      const result = await compilePython(session.token, currentRound.p1.code);
      if (!result.ok) {
        const msg = result.timedOut ? 'Execution timed out. Try again.' : (result.stderr || 'Compilation failed');
        setFeedback({ type: 'err', msg });
        return;
      }

      const actualOutput = result.stdout.trim();
      const expectedOutput = currentRound.p1.ans.trim();
      const userAnswer = p1Input.trim();

      if (userAnswer && normalizeAnswer(userAnswer) === normalizeAnswer(actualOutput) && normalizeAnswer(actualOutput) === normalizeAnswer(expectedOutput)) {
        setFeedback({ type: 'ok', msg: `Correct! ${currentRound.p1.output}` });
        setTimeout(() => {
          updateState({ stage: 'p1_solved' });
          setFeedback(null);
          setP1Input('');
          setShowHint(false);
        }, 1000);
      } else {
        setFeedback({ type: 'err', msg: 'Incorrect output. Try again!' });
      }
    } catch (error) {
      setFeedback({ type: 'err', msg: error instanceof Error ? error.message : 'Compilation failed' });
    }
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
    setShowHint(false);
  };

  const isMyTurn = (role === 'solver' && ['p1_solve', 'p1_solved'].includes(gameState!.stage)) ||
                   (role === 'runner' && ['runner_travel', 'runner_game', 'runner_done'].includes(gameState!.stage));

  return (
    <>
      <PersistentProgress totalRounds={rounds.length} currentRound={gameState?.round ?? 0} roundsDone={gameState?.roundsDone ?? []} />
      <GridBackground />
      <Navbar 
        brandName="QUEST" 
        ctaText="SYSTEM"
        metaText={role?.toUpperCase()}
        onMenuOpen={() => {}}
        startTime={gameState?.startTime}
        finishTime={gameState?.finishTime}
      />
      
      <div className="min-h-screen pt-16 pb-8 px-4 sm:px-6 relative z-10 text-white bg-[#15171A] reveal-up">
        <div className="w-full">
          {/* Header */}
          <div className="mb-[var(--svh-md)] space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3 w-3 text-[#95FF00] fill-[#95FF00]" />
                  <span className="label-technical">Operational Telemetry</span>
                </div>
                <h1 className="text-4xl font-bold uppercase tracking-tighter leading-none font-space-grotesk">
                  ROUND <span className="text-[#95FF00]">0{gameState!.round + 1}</span>
                </h1>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="uppercase text-[9px] border-[#95FF00]/40 text-[#95FF00] bg-[#95FF00]/5 px-2 py-0 rounded-none tracking-widest font-mono">{role}</Badge>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-tight">{session.team.name} @ SYSTEM_ROOT</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            <motion.div key={gameState!.stage + gameState!.round} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {!isMyTurn && gameState!.stage !== 'complete' ? (
                  <div className="corner-card border-[#95FF00]/20 bg-[#95FF00]/5 p-16 text-center space-y-6">
                    <div className="corner-br" /> <div className="corner-bl" />
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border border-[#95FF00] animate-ping opacity-20" />
                      <div className="w-full h-full bg-[#95FF00]/10 border border-[#95FF00]/40 flex items-center justify-center">
                        {role === 'solver' ? <MapPin className="text-[#95FF00] animate-pulse" /> : <Zap className="text-[#95FF00] animate-pulse" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-[#95FF00] text-xl font-bold tracking-widest uppercase">AWAITING OPERATIVE</h2>
                      <p className="uppercase tracking-[0.1em] text-[10px] text-white/40">
                        Node 0{role === 'solver' ? '2' : '01'} is currently processing objective...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* P1 Solve - Solver's turn to code */}
                    {gameState!.stage === 'p1_solve' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left: Code Puzzle */}
                        <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-white/5 relative h-full">
                          <div className="corner-br" /> <div className="corner-bl" />
                          <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                              <span className="label-technical text-[#95FF00]">Local Node Objective</span>
                              <h2 className="text-xl font-bold tracking-widest uppercase">{currentRound.p1.title}</h2>
                            </div>
                            
                            <div className="relative group">
                              <div className="absolute -top-3 left-4 px-2 bg-[#15171A] border border-white/10 font-mono text-[9px] uppercase tracking-widest text-white/40 z-10">
                                core_logic.py
                              </div>
                              <div className="code-display min-h-[300px] border-[#95FF00]/10 transition-colors group-hover:border-[#95FF00]/30">
                                {highlightCode(currentRound.p1.code)}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="label-technical">Intelligence Hint</span>
                                <button 
                                  onClick={() => setShowHint(!showHint)}
                                  className="text-[10px] font-mono uppercase tracking-widest text-[#95FF00]/60 hover:text-[#95FF00] transition-colors flex items-center gap-1"
                                >
                                  {showHint ? "CLOSE_DECRYPT" : "DECRYPT_HINT"}
                                </button>
                              </div>
                              
                              <AnimatePresence>
                                {showHint && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-4 border border-[#95FF00]/20 bg-[#95FF00]/5 text-[11px] font-mono leading-relaxed text-white/70 uppercase tracking-tight">
                                      {currentRound.p1.hint}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>

                        {/* Right: Input & Trace */}
                        <div className="space-y-6">
                          <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-white/5 relative">
                            <div className="corner-tr" /> <div className="corner-bl" />
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <span className="label-technical">Input Extraction</span>
                                <div className="relative">
                                  <input 
                                    placeholder="ENTER OUTPUT..." 
                                    className="w-full high-clearance-input" 
                                    value={p1Input} 
                                    onChange={(e) => setP1Input(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && checkP1()} 
                                    autoFocus
                                    autoComplete="off"
                                    spellCheck="false"
                                  />
                                  {feedback && (
                                    <div className={cn(
                                      "absolute -bottom-[2px] left-0 right-0 h-[2px]",
                                      feedback.type === 'ok' ? "bg-[#95FF00]" : "bg-rose-500"
                                    )} />
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button className="flex-1 font-bold uppercase tracking-[0.2em] h-14" variant="sage" size="md" onClick={checkP1}>
                                  EXECUTE_TRACE
                                </Button>
                                {devMode && (
                                  <Button variant="secondary" className="w-14 h-14 border-white/10" size="sm" onClick={() => setP1Input(currentRound.p1.ans)}>
                                    <Zap className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Trace Console */}
                          <div className="corner-card bg-[#0B0C0D] border-white/5 p-6 h-[240px] flex flex-col">
                            <span className="label-technical mb-4 block text-[#95FF00]/60">Execution Trace Console</span>
                            <div className="font-mono text-[11px] space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                              {feedback ? (
                                <div className={cn(
                                  "p-3 border-l-2 bg-white/[0.02]",
                                  feedback.type === 'ok' ? "border-[#95FF00] text-[#95FF00]" : "border-rose-500 text-rose-500"
                                )}>
                                  <div className="text-[9px] uppercase tracking-widest opacity-50 mb-1">
                                    {feedback.type === 'err' ? "Runtime Error" : "Success Payload"}
                                  </div>
                                  {feedback.msg}
                                </div>
                              ) : (
                                <div className="text-white/20 animate-pulse flex items-center gap-2">
                                  <div className="w-1 h-3 bg-white/20 animate-blink" />
                                  AWAITING EXECUTION COMMAND...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* P1 Solved - Show coordinates */}
                    {gameState!.stage === 'p1_solved' && (
                      <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-white/5 relative overflow-hidden">
                        <div className="corner-br" /> <div className="corner-bl" />
                        <div className="space-y-6">
                          <div className="text-center">
                            <CheckCircle2 className="h-12 w-12 text-[#95FF00] mx-auto mb-4" />
                            <h2 className="text-xl font-bold tracking-widest uppercase">Puzzle Solved!</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Coordinates revealed for the Runner.</p>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Coordinates Card */}
                            <div className="corner-card bg-[#95FF00]/5 border border-[#95FF00]/20 p-4 relative">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[10px] font-bold text-[#95FF00]/60 uppercase">Latitude</span>
                                  <div className="font-mono text-m text-white">{currentRound.coord.lat}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-[#95FF00]/60 uppercase">Longitude</span>
                                  <div className="font-mono text-m text-white">{currentRound.coord.lng}</div>
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-[#95FF00]/20 flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-[#95FF00] flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-bold text-s uppercase tracking-wider">{currentRound.coord.place}</div>
                                  <div className="text-[10px] text-white/40 uppercase">Target: {currentRound.volunteer.name}</div>
                                </div>
                              </div>
                            </div>

                            {/* Passkey */}
                            <div className="corner-card bg-[#95FF00]/10 border border-[#95FF00] p-4 text-center">
                              <div className="text-[10px] font-bold text-[#95FF00] uppercase tracking-[0.2em] mb-1">Passkey</div>
                              <div className="font-mono text-xl font-bold tracking-[0.4em] text-white">{currentRound.qrPasskey}</div>
                            </div>

                            <Button 
                              className="w-full font-bold uppercase tracking-[0.2em] h-12"
                              variant="emerald"
                              size="md"
                              onClick={() => updateState({
                                stage: 'runner_travel',
                                handoff: {
                                  passkey: currentRound.qrPasskey,
                                  lat: currentRound.coord.lat,
                                  lng: currentRound.coord.lng,
                                  volunteer: currentRound.volunteer.name,
                                  place: currentRound.coord.place,
                                },
                              })}
                            >
                              Synchronize Node 02
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Runner Travel - Runner navigates to location */}
                    {gameState!.stage === 'runner_travel' && (
                      <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-white/5 relative overflow-hidden">
                        <div className="corner-br" /> <div className="corner-bl" />
                        <div className="space-y-6">
                          <div className="flex flex-col gap-2">
                              <Badge className="w-fit mb-2 bg-[#95FF00]/10 text-white border border-[#95FF00] text-[10px] uppercase">Round {gameState!.round + 1}</Badge>
                            <h2 className="text-xl font-bold tracking-widest uppercase">Travel to Location</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">Find the volunteer at the coordinates provided below.</p>
                          </div>
                          
                          <div className="space-y-4">
                            {gameState!.handoff && (
                              <div className="corner-card border-[#95FF00] bg-[#95FF00]/5 p-4 space-y-2 text-s relative">
                                <div className="corner-tr" />
                                <div><span className="text-[10px] uppercase text-[#95FF00]/60 font-bold mr-2">Volunteer:</span> {gameState!.handoff.volunteer}</div>
                                <div><span className="text-[10px] uppercase text-[#95FF00]/60 font-bold mr-2">Passkey:</span> <span className="font-mono text-white tracking-widest">{gameState!.handoff.passkey}</span></div>
                                <div><span className="text-[10px] uppercase text-[#95FF00]/60 font-bold mr-2">Target Node:</span> {gameState!.handoff.place}</div>
                              </div>
                            )}

                            {/* Coordinates */}
                            <div className="corner-card bg-[#15171A] grid grid-cols-2 gap-4 p-4 border border-white/5">
                              <div>
                                <span className="text-[10px] font-bold text-white/30 uppercase">Latitude</span>
                                <div className="font-mono text-m text-white/80">{currentRound.coord.lat}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-white/30 uppercase">Longitude</span>
                                <div className="font-mono text-m text-white/80">{currentRound.coord.lng}</div>
                              </div>
                            </div>

                            {/* Volunteer card */}
                            <div className={cn("corner-card flex items-center gap-3 p-4 border border-white/5 transition-all duration-500", currentRound.volunteer.bg)}>
                              <div className={cn("w-10 h-10 rounded-none border border-white/10 flex items-center justify-center font-bold text-sm", currentRound.volunteer.color)}>
                                {currentRound.volunteer.initials}
                              </div>
                              <div className="flex flex-col">
                                <div className={cn("font-bold text-lg uppercase tracking-wider", currentRound.volunteer.color)}>
                                  {currentRound.volunteer.name}
                                </div>
                                <div className="text-[10px] text-white/60 uppercase tracking-widest font-mono">
                                  {currentRound.coord.place}
                                </div>
                              </div>
                              <div className="corner-br opacity-50"></div>
                              <div className="corner-bl opacity-50"></div>
                            </div>

                            {/* Arrived — open passkey + minigame */}
                            <div className="pt-4 border-t border-white/5">
                              <Button className="w-full font-bold uppercase tracking-[0.2em] h-14" variant="sage" size="md" onClick={() => updateState({ stage: 'runner_game' })}>
                                <QrCode className="mr-3 h-5 w-5" />
                                I'M AT THE LOCATION — ENTER PASSKEY
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

                    {/* Quest Complete */}
                    {gameState!.stage === 'complete' && (
                      <div className="corner-card bg-black/40 backdrop-blur-xl p-8 border border-[#95FF00]/30 relative text-center overflow-hidden">
                        <div className="corner-br" /> <div className="corner-bl" />
                        <div className="absolute inset-0 bg-[#95FF00]/5 pointer-events-none" />
                        <div className="relative z-10 space-y-8">
                          <div>
                            <Zap className="h-16 w-16 text-[#95FF00] fill-[#95FF00] mx-auto mb-6 animate-pulse" />
                            <h2 className="text-3xl font-bold tracking-[0.3em] uppercase mb-2 text-[#95FF00]">Quest Complete</h2>
                            <p className="text-[10px] text-white/60 uppercase tracking-[0.4em]">All nodes synchronized. Protocol achieved.</p>
                          </div>
                          
                          <div className="space-y-3">
                            {rounds.map((r: RoundQuestion, i: number) => (
                              <div key={i} className="corner-card flex items-center gap-3 p-4 bg-white/5 border border-white/5 text-left relative group hover:border-[#95FF00]/30 transition-all">
                                <div className={cn("w-10 h-10 rounded-none border border-white/10 flex items-center justify-center text-xs font-bold", r.volunteer.bg, r.volunteer.color)}>
                                  {r.volunteer.initials}
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-bold uppercase tracking-widest text-[#95FF00]/80">Round {i + 1}</div>
                                  <div className="text-[10px] text-white/40 uppercase tracking-tighter">{r.coord.place}</div>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-[#95FF00]" />
                              </div>
                            ))}
                          </div>
                          
                          <Button variant="ink" className="w-full font-bold uppercase tracking-[0.2em] h-12" onClick={reset}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Restart Session
                          </Button>
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
              <div className="corner-card bg-black/40 backdrop-blur-xl border border-white/5 relative">
                <div className="corner-tr" />
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <div>
                    <span className="label-technical text-[#95FF00]">Sector Telemetry</span>
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
