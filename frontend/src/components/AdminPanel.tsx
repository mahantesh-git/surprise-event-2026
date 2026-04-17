import { useState, useEffect, useMemo } from 'react';
import { Lock, LogOut, Plus, Trash2, Edit3, Save, X, Database, ShieldAlert, ChevronLeft, Terminal, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Leaderboard } from '@/components/Leaderboard';
import { 
    adminLogin, 
    getAdminTeams, 
    createAdminTeam, 
    deleteAdminTeam, 
    deleteAllAdminTeams,
    getAdminQuestions, 
    createAdminQuestion, 
    updateAdminQuestion, 
    deleteAdminQuestion, 
    deleteAllAdminQuestions,
    wipeAdminDatabase, 
    getAdminConfig,
    updateAdminConfig,
    type RoundQuestion 
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LANGUAGE_OPTIONS } from '@/components/CodeEditor';
import type { QuestionLanguage } from '@/lib/api';

const ADMIN_SESSION_KEY = 'quest-admin-session';

function buildLocationQrCode(round: number) {
  return `QUEST-LOC-R${Math.max(1, Math.trunc(round || 1))}`;
}

function createEmptyQuestion(nextRound: number): RoundQuestion {
  return {
    id: '',
    round: nextRound,
    p1: { title: '', code: '', hint: '', ans: '', output: '', language: 'python', testCases: [] },
    coord: { lat: '', lng: '', place: '' },
    volunteer: { name: '', initials: '', bg: 'bg-indigo-100', color: 'text-indigo-700' },
    qrPasskey: '',
    locationQrCode: '',
    cx: 0.5,
    cy: 0.5,
  };
}

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(ADMIN_SESSION_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Array<{ id: string; name: string; email: string; createdAt: string; lastLoginAt: string | null }>>([]);
  const [questions, setQuestions] = useState<RoundQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'manage' | 'leaderboard'>('manage');

  const [teamName, setTeamName] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamPassword, setTeamPassword] = useState('');

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<RoundQuestion>(createEmptyQuestion(1));

  const nextRoundNumber = useMemo(() => {
    return Math.max(1, ...questions.map((question) => question.round)) + 1;
  }, [questions]);

  const refreshData = async (sessionToken: string) => {
    try {
      const [teamsResponse, questionsResponse, configResponse] = await Promise.all([
        getAdminTeams(sessionToken).catch(() => ({ teams: [] })),
        getAdminQuestions(sessionToken).catch(() => ({ questions: [] })),
        getAdminConfig(sessionToken).catch(() => ({ loginEnabled: false })),
      ]);
      
      setTeams(teamsResponse?.teams || []);
      const qArr = questionsResponse?.questions || (Array.isArray(questionsResponse) ? questionsResponse : []);
      const sorted = [...qArr].sort((a, b) => (a.round || 0) - (b.round || 0));
      setQuestions(sorted);
      setLoginEnabled(!!configResponse?.loginEnabled);
      setError(null);
    } catch {
      setError('Failed to refresh data from server');
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshData(token).finally(() => setLoading(false));
  }, [token]);

  const handleAdminLogin = async () => {
    setError(null);
    try {
      const response = await adminLogin(email, password);
      window.localStorage.setItem(ADMIN_SESSION_KEY, response.token);
      setToken(response.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    }
  };

  const handleAdminLogout = () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setToken(null);
    setError(null);
  };

  const handleToggleLogin = async () => {
    if (!token) return;
    setError(null);
    try {
      const newVal = !loginEnabled;
      await updateAdminConfig(token, 'loginEnabled', newVal);
      setLoginEnabled(newVal);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update config');
    }
  };

  const handleCreateTeam = async () => {
    if (!token) return;
    setError(null);
    try {
      await createAdminTeam(token, { name: teamName, email: teamEmail, password: teamPassword });
      setTeamName('');
      setTeamEmail('');
      setTeamPassword('');
      await refreshData(token);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!token) return;
    setError(null);
    try {
      await deleteAdminTeam(token, teamId);
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete team');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!token) return;
    const confirmed = window.confirm('Delete all teams? This will clear all team progress.');
    if (!confirmed) return;

    setError(null);
    try {
      await deleteAllAdminTeams(token);
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete all teams');
    }
  };

  const handleEditQuestion = (question: RoundQuestion) => {
    setEditingQuestionId(question.id || null);
    setDraftQuestion({ ...question, locationQrCode: question.locationQrCode || buildLocationQrCode(question.round) });
  };

  const handleSaveQuestion = async () => {
    if (!token) return;
    setError(null);
    try {
      if (editingQuestionId) {
        await updateAdminQuestion(token, editingQuestionId, draftQuestion);
      } else {
        await createAdminQuestion(token, draftQuestion);
      }

      setEditingQuestionId(null);
      setDraftQuestion(createEmptyQuestion(nextRoundNumber));
      await refreshData(token);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId: string | undefined) => {
    if (!token || !questionId) return;
    setError(null);
    try {
      await deleteAdminQuestion(token, questionId);
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete question');
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (!token) return;
    const confirmed = window.confirm('Delete all questions? This cannot be undone.');
    if (!confirmed) return;

    setError(null);
    try {
      await deleteAllAdminQuestions(token);
      setEditingQuestionId(null);
      setDraftQuestion(createEmptyQuestion(1));
      await refreshData(token);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete all questions');
    }
  };

  const handleWipeDatabase = async () => {
    if (!token) return;
    const confirmed = window.confirm('Delete ALL teams and ALL questions from database? This is irreversible.');
    if (!confirmed) return;

    setError(null);
    try {
      await wipeAdminDatabase(token);
      setEditingQuestionId(null);
      setDraftQuestion(createEmptyQuestion(1));
      await refreshData(token);
    } catch (wipeError) {
      setError(wipeError instanceof Error ? wipeError.message : 'Failed to wipe database');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 relative overflow-hidden bg-[#15171A]">
        {/* Decorative background number */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-[40vw] font-black leading-none">00</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md z-10"
        >
          <div className="corner-card border-[#95FF00]/20 bg-black/40 backdrop-blur-xl p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-[#95FF00]/5 border border-[#95FF00]/20 flex items-center justify-center mx-auto mb-2 relative group">
                <div className="absolute -inset-2 bg-[#95FF00]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock className="text-[#95FF00] w-8 h-8 relative z-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-[#95FF00] tracking-[0.3em] font-black uppercase text-2xl">
                  Admin_Auth
                </h1>
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-[1px] w-8 bg-[#95FF00]/30" />
                  <span className="uppercase tracking-[0.4em] text-[8px] text-white/40">
                    Secured_Access_Node
                  </span>
                  <div className="h-[1px] w-8 bg-[#95FF00]/30" />
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="relative group">
                  <Input 
                    type="email"
                    placeholder="Admin Email" 
                    value={email} 
                    onChange={(event) => setEmail(event.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="bg-black/50 border-white/10 group-focus-within:border-[#95FF00]/50 transition-colors uppercase text-[10px] tracking-widest h-12"
                  />
                </div>
                <div className="relative group">
                  <Input 
                    placeholder="Security Key" 
                    type="password" 
                    value={password} 
                    onChange={(event) => setPassword(event.target.value)} 
                    onKeyDown={(event) => event.key === 'Enter' && handleAdminLogin()}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="bg-black/50 border-white/10 group-focus-within:border-[#95FF00]/50 transition-colors uppercase text-[10px] tracking-widest h-12"
                  />
                </div>
              </div>

              {error && (
                <div className="border border-red-500/50 bg-red-500/10 p-3 text-[10px] uppercase tracking-widest text-red-400 font-mono">
                  ERROR: {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="ink" 
                  className="flex-1 font-bold uppercase tracking-[0.2em] h-12" 
                  onClick={onBack}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Terminal
                </Button>
                <Button 
                  variant="sage" 
                  className="flex-1 font-bold uppercase tracking-[0.2em] h-12" 
                  onClick={handleAdminLogin}
                >
                  Authenticate
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#15171A] text-white px-4 sm:px-6 py-12 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="fixed top-0 right-0 p-12 opacity-[0.02] pointer-events-none select-none">
        <span className="text-[20vw] font-black leading-none uppercase">Admin</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8 relative">
          <div className="absolute -left-12 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[#95FF00]/20 to-transparent hidden xl:block" />
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-[#95FF00]">
              <Database className="w-4 h-4" />
              <div className="h-[1px] w-8 bg-[#95FF00]/50" />
              <span className="text-[8px] uppercase font-mono tracking-[0.4em] text-[#95FF00]/60">v2.0.4.sys_admin</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
              Control<span className="text-[#95FF00]">_</span>Center
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tabs */}
            <div className="flex border border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-5 h-10 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${
                  activeTab === 'manage' ? 'bg-[#95FF00]/10 text-[#95FF00]' : 'text-white/30 hover:text-white/60'
                }`}
              >
                <Database className="w-3 h-3" />
                Manage
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-5 h-10 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border-l border-white/10 ${
                  activeTab === 'leaderboard' ? 'bg-[#95FF00]/10 text-[#95FF00]' : 'text-white/30 hover:text-white/60'
                }`}
              >
                <Trophy className="w-3 h-3" />
                Leaderboard
              </button>
            </div>
            <Button variant="ink" className="font-bold uppercase tracking-[0.2em] h-10 px-6 border-white/5 bg-white/[0.02] text-[10px]" onClick={onBack}>
              Terminal_Exit
            </Button>
            <Button variant="ghost" className="font-bold uppercase tracking-[0.2em] h-10 px-6 border-red-500/10 text-red-500/60 hover:text-red-400 hover:bg-red-500/5 text-[10px]" onClick={handleAdminLogout}>
              <LogOut className="mr-2 h-3 w-3" />
              Disconnect
            </Button>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="border border-red-500/50 bg-red-500/10 p-4 text-xs uppercase tracking-widest text-red-400 font-mono flex items-center gap-3"
          >
            <ShieldAlert className="w-4 h-4" />
            SYSTEM_ERROR: {error}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="-mx-4 sm:-mx-6 h-[calc(100vh-200px)] min-h-[500px] relative">
            <Leaderboard />
          </div>
        )}

        {activeTab === 'manage' && (<>
        {/* Create Team Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <Plus className="text-[#95FF00] w-3 h-3" />
            <h2 className="text-[9px] font-mono uppercase tracking-[0.5em] text-white/30">Register_New_Operative</h2>
          </div>
          <div className="corner-card border-white/5 bg-white/[0.01] p-4 flex flex-col md:flex-row gap-4">
            <Input placeholder="OP_NAME" value={teamName} onChange={(event) => setTeamName(event.target.value)} className="bg-black/40 border-white/5 text-[10px] uppercase tracking-widest h-11 flex-1" />
            <Input placeholder="REGISTRY_EMAIL" value={teamEmail} onChange={(event) => setTeamEmail(event.target.value)} className="bg-black/40 border-white/5 text-[10px] uppercase tracking-widest h-11 flex-1" />
            <Input placeholder="PASSKEY" type="password" value={teamPassword} onChange={(event) => setTeamPassword(event.target.value)} className="bg-black/40 border-white/5 text-[10px] uppercase tracking-widest h-11 flex-1" />
            <Button variant="sage" className="font-bold uppercase tracking-[0.3em] h-11 px-8" onClick={handleCreateTeam}>
              Register
            </Button>
          </div>
        </section>

        {/* Global Event Control */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <ShieldAlert className="text-[#95FF00] w-3 h-3" />
            <h2 className="text-[9px] font-mono uppercase tracking-[0.5em] text-white/30">Global_Event_Config</h2>
          </div>
          <div className="corner-card border-white/5 bg-white/[0.01] p-6 flex flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold uppercase tracking-widest">Enable Team Login</h3>
              <p className="text-white/50 text-xs font-mono tracking-tighter">Controls whether operatives can authenticate into the system and start their timer.</p>
            </div>
            <button
              onClick={handleToggleLogin}
              className={`relative inline-flex h-8 w-14 items-center rounded-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#95FF00] focus:ring-offset-2 focus:ring-offset-[#15171A] ${
                loginEnabled ? 'bg-[#95FF00]' : 'bg-white/10'
              }`}
            >
              <span className="sr-only">Toggle Team Login</span>
              <span
                className={`inline-block h-6 w-6 transform bg-white transition-transform ${
                  loginEnabled ? 'translate-x-7 bg-black' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Main Workspace Layout */}
        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Left Column: Team Management */}
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Terminal className="text-[#95FF00] w-4 h-4" />
                  <h2 className="text-xs font-mono uppercase tracking-[0.4em] text-white/40">Active_Nodes</h2>
                </div>
                {teams.length > 0 && (
                  <Button variant="ink" className="text-red-400 p-0 h-auto text-[9px] uppercase tracking-widest bg-transparent border-none hover:bg-transparent" onClick={handleDeleteAllTeams}>
                    Wipe All
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {teams.map((team) => (
                  <motion.div 
                    layout
                    key={team.id} 
                    className="corner-card p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div>
                      <div className="text-[10px] text-[#95FF00] font-mono mb-1">{team.id.slice(-6).toUpperCase()}</div>
                      <div className="font-bold uppercase tracking-widest text-sm">{team.name}</div>
                      <div className="text-[9px] text-white/40 font-mono tracking-tighter italic">{team.email || 'NO_IDENTIFIER'}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white/20 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
                {!teams.length && !loading && (
                  <div className="text-[10px] uppercase tracking-widest text-white/20 border border-white/5 p-8 text-center bg-black/20">
                    No nodes prioritized
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Columns: Question Management */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Editor */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <Edit3 className="text-[#95FF00] w-3 h-3" />
                <h2 className="text-[9px] font-mono uppercase tracking-[0.5em] text-white/30">
                  {editingQuestionId ? 'Modify_Simulation_Data' : 'Initialize_New_Simulation'}
                </h2>
              </div>
              <div className="corner-card border-[#95FF00]/10 bg-black/40 backdrop-blur-md p-8 pt-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-[#95FF00]/20 uppercase tracking-widest">
                  sys.editor.active
                </div>
                <div className="space-y-8">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[8px] uppercase tracking-[0.3em] text-white/30 ml-1">Sequence_ID</label>
                      <Input type="number" value={draftQuestion.round} onChange={(event) => setDraftQuestion({ ...draftQuestion, round: Number(event.target.value) })} className="bg-white/[0.02] border-white/5 h-11 font-mono text-xs focus:border-[#95FF00]/30 transition-colors" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[8px] uppercase tracking-[0.3em] text-white/30 ml-1">Secure_Passkey_Vector</label>
                      <Input placeholder="SCAN_KEY_00X" value={draftQuestion.qrPasskey} onChange={(event) => setDraftQuestion({ ...draftQuestion, qrPasskey: event.target.value })} className="bg-white/[0.02] border-white/5 h-11 font-mono text-xs uppercase tracking-widest focus:border-[#95FF00]/30 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/30 ml-1">Location_QR_Payload</label>
                    <Input
                      readOnly
                      value={draftQuestion.locationQrCode || buildLocationQrCode(draftQuestion.round)}
                      className="bg-white/[0.02] border-white/5 h-11 font-mono text-xs uppercase tracking-widest text-[#95FF00] focus:border-[#95FF00]/30 transition-colors"
                    />
                    <p className="text-[9px] text-white/35 font-mono uppercase tracking-widest">
                      Auto-generated per question. Print a QR with this exact value for the runner&apos;s location.
                    </p>
                  </div>

                  {/* Component A & B */}
                  <div className="grid md:grid-cols-2 gap-8 pt-4">
                    {/* Solver Side */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] text-[#95FF00] uppercase tracking-widest mb-2">
                        <div className="w-1 h-1 bg-[#95FF00]" /> Node_Alpha
                      </div>
                      <Input placeholder="Objective Title" value={draftQuestion.p1.title} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, title: event.target.value } })} className="bg-white/5 border-white/10" />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <select 
                            value={draftQuestion.p1.language || 'python'}
                            onChange={(e) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, language: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 h-10 px-3 font-mono text-[10px] text-white focus:outline-none focus:border-[#95FF00]/50 transition-colors uppercase appearance-none"
                          >
                            {LANGUAGE_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id} className="bg-[#15171A] text-white">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Input placeholder="Expected Output" value={draftQuestion.p1.ans} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, ans: event.target.value } })} className="bg-white/5 border-white/10 font-mono text-[10px]" />
                      </div>
                      <textarea 
                        placeholder="Simulation Matrix (Code)" 
                        value={draftQuestion.p1.code} 
                        onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, code: event.target.value } })} 
                        className="w-full bg-white/5 border border-white/10 rounded-none p-3 font-mono text-xs min-h-[120px] focus:outline-none focus:border-[#95FF00]/50 transition-colors"
                      />
                      
                      {/* Test Cases Section */}
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-widest text-[#95FF00]/60">Verification_Test_Suite</label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[8px] uppercase tracking-widest text-[#95FF00] hover:bg-[#95FF00]/10 border border-[#95FF00]/20"
                            onClick={() => {
                              const existing = draftQuestion.p1.testCases || [];
                              setDraftQuestion({
                                ...draftQuestion,
                                p1: {
                                  ...draftQuestion.p1,
                                  testCases: [...existing, { input: '', output: '' }]
                                }
                              });
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Case
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                          {(draftQuestion.p1.testCases || []).map((tc, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2">
                              <Input 
                                placeholder="Input" 
                                value={tc.input} 
                                onChange={(e) => {
                                  const cases = [...(draftQuestion.p1.testCases || [])];
                                  cases[idx].input = e.target.value;
                                  setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, testCases: cases } });
                                }}
                                className="col-span-11 bg-white/5 border-white/5 h-8 font-mono text-[9px]"
                              />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="col-span-1 p-0 h-8 text-rose-500 hover:bg-rose-500/10"
                                onClick={() => {
                                  const cases = (draftQuestion.p1.testCases || []).filter((_, i) => i !== idx);
                                  setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, testCases: cases } });
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              <Input 
                                placeholder="Expected Output" 
                                value={tc.output} 
                                onChange={(e) => {
                                  const cases = [...(draftQuestion.p1.testCases || [])];
                                  cases[idx].output = e.target.value;
                                  setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, testCases: cases } });
                                }}
                                className="col-span-12 bg-[#95FF00]/5 border-[#95FF00]/10 h-8 font-mono text-[9px] text-[#95FF00]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Input placeholder="Intel Hint" value={draftQuestion.p1.hint} onChange={(event) => setDraftQuestion({ ...draftQuestion, p1: { ...draftQuestion.p1, hint: event.target.value } })} className="bg-white/5 border-white/10 text-xs italic" />
                    </div>

                    {/* Runner Side */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest mb-2">
                        <div className="w-1 h-1 bg-white/40" /> Node_Beta
                      </div>
                      <Input placeholder="Vector Destination" value={draftQuestion.coord.place} onChange={(event) => setDraftQuestion({ ...draftQuestion, coord: { ...draftQuestion.coord, place: event.target.value } })} className="bg-white/5 border-white/10" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Lat" value={draftQuestion.coord.lat} onChange={(event) => setDraftQuestion({ ...draftQuestion, coord: { ...draftQuestion.coord, lat: event.target.value } })} className="bg-white/5 border-white/10 font-mono text-[10px]" />
                        <Input placeholder="Lng" value={draftQuestion.coord.lng} onChange={(event) => setDraftQuestion({ ...draftQuestion, coord: { ...draftQuestion.coord, lng: event.target.value } })} className="bg-white/5 border-white/10 font-mono text-[10px]" />
                      </div>
                      <Input placeholder="Field Operative" value={draftQuestion.volunteer.name} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, name: event.target.value } })} className="bg-white/5 border-white/10" />
                      <div className="flex gap-2">
                        <Input placeholder="Initials" value={draftQuestion.volunteer.initials} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, initials: event.target.value } })} className="bg-white/5 border-white/10 w-24" />
                        <Input placeholder="Accent_Color (HEX)" value={draftQuestion.volunteer.color} onChange={(event) => setDraftQuestion({ ...draftQuestion, volunteer: { ...draftQuestion.volunteer, color: event.target.value } })} className="bg-white/5 border-white/10 flex-1" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-white/5">
                    <Button 
                      variant="sage" 
                      className="flex-1 font-bold uppercase tracking-[0.2em] h-12" 
                      onClick={handleSaveQuestion}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {editingQuestionId ? 'Finalize_Update' : 'Commit_To_Database'}
                    </Button>
                    <Button 
                      variant="ink" 
                      className="font-bold uppercase tracking-[0.2em] h-12 px-6"
                      onClick={() => {
                        setEditingQuestionId(null);
                        setDraftQuestion(createEmptyQuestion(nextRoundNumber));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* List */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Terminal className="text-[#95FF00] w-4 h-4" />
                  <h2 className="text-xs font-mono uppercase tracking-[0.4em] text-white/40">Active_Simulation_Sequences</h2>
                </div>
                <Button variant="ink" className="text-red-400 p-0 h-auto text-[9px] uppercase tracking-widest bg-transparent border-none hover:bg-transparent" onClick={handleDeleteAllQuestions}>
                  Purge All
                </Button>
              </div>
              <div className="grid gap-3">
                {questions
                  .slice()
                  .sort((a, b) => a.round - b.round)
                  .map((question) => (
                    <motion.div 
                      key={question.id || question.round} 
                      className="corner-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-white/5 bg-white/[0.01]"
                    >
                      <div className="flex gap-6 items-center">
                        <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl">
                          {question.round}
                        </div>
                        <div>
                          <div className="font-bold uppercase tracking-widest mb-1">{question.p1.title}</div>
                          <div className="text-[10px] text-white/30 font-mono flex gap-4 uppercase">
                            <span>Target: {question.coord.place}</span>
                            <span>Key: {question.qrPasskey}</span>
                            <span>QR: {question.locationQrCode || buildLocationQrCode(question.round)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ink" 
                          size="sm" 
                          className="font-mono text-[9px] uppercase tracking-widest border-white/5 h-10 px-4"
                          onClick={() => handleEditQuestion(question)}
                        >
                          Modify
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-white/20 hover:text-red-400 hover:bg-red-500/10 h-10 w-10 p-0"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                }
                {!questions.length && !loading && (
                  <div className="text-[10px] uppercase tracking-widest text-white/20 border border-white/5 p-12 text-center bg-black/10">
                    No simulation data detected
                  </div>
                )}
              </div>
            </section>

            {/* Final Danger Zone */}
            <section className="pt-12">
              <div className="border border-red-500/20 bg-red-500/[0.02] p-8 space-y-4">
                <div className="flex items-center gap-3 text-red-500">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-black uppercase tracking-tight">Level_0_Protocol</h3>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-[#95FF00]/40 max-w-md">
                  Immediate termination of all database records including Operative accounts and Simulation data. This action is irreversible.
                </p>
                <Button 
                  variant="ink" 
                  className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold uppercase tracking-[0.2em] h-12 w-full"
                  onClick={handleWipeDatabase}
                >
                  Authorize_Nuke
                </Button>
              </div>
            </section>
          </div>

        </div>
        </>)}
      </div>
    </div>
  );
}
