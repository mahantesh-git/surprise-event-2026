import React, { useState, useEffect } from 'react';
import { getAdminArena1Teams, createAdminArena1Team, deleteAdminArena1Team, adminGradeArena1Submission, getAdminArena1Questions, adminStartArena1, adminEndArena1, adminPostArena1DiscordReport, Arena1Question, Arena1SlotResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Code2, Download, Plus, Users, Play, Square, Trash2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSocket } from '@/contexts/SocketContext';
import { Arena1QuestionManagement } from '@/components/admin/Arena1QuestionManagement';
import { motion } from 'framer-motion';
import { useAdminToast } from '@/contexts/AdminToastContext';

export function AdminArena1Panel({ token }: { token: string }) {
  const { showToast, confirm } = useAdminToast();
  const { socket } = useSocket();
  const [teams, setTeams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Arena1Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'operatives' | 'sequences'>('operatives');

  // Grading Modal State
  const [gradingSlot, setGradingSlot] = useState<{ teamId: string; teamName: string; slot: number; result: Arena1SlotResult } | null>(null);
  const [gradePoints, setGradePoints] = useState<number>(0);
  const [isGrading, setIsGrading] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [codeText, setCodeText] = useState('');

  // Creation state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Game control state
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Derive overall game status from teams
  const gameStatus = teams.length === 0 ? 'waiting'
    : teams.some((t: any) => t.gameState?.status === 'active') ? 'active'
    : teams.every((t: any) => t.gameState?.status === 'done') ? 'done'
    : 'waiting';

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [teamsRes, qRes] = await Promise.all([
        getAdminArena1Teams(token),
        getAdminArena1Questions(token)
      ]);
      setTeams(teamsRes.teams);
      setQuestions(qRes.questions);
    } catch (err) {
      console.error('Failed to load A1 admin data', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRefresh = () => {
      fetchData(true); // silent refresh
    };

    if (socket) {
      socket.on('a1:admin:refresh', handleRefresh);
      socket.on('a1:state-refresh', handleRefresh);
    }

    return () => {
      if (socket) {
        socket.off('a1:admin:refresh', handleRefresh);
        socket.off('a1:state-refresh', handleRefresh);
      }
    };
  }, [token, socket]);

  useEffect(() => {
    if (gradingSlot && viewMode === 'code') {
      setCodeText('Loading...');
      fetch(`/api/admin/a1/submissions/${gradingSlot.teamId}/${gradingSlot.slot}?token=${token}`)
        .then(res => res.text())
        .then(text => setCodeText(text))
        .catch(() => setCodeText('Failed to load code'));
    }
  }, [gradingSlot, viewMode, token]);

  const handleDeleteTeam = async (teamId: string) => {
    const ok = await confirm({
      title: 'Delete Team',
      message: 'Are you sure you want to delete this team? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Abort'
    });
    if (!ok) return;
    try {
      await deleteAdminArena1Team(token, teamId);
      showToast('Team deleted successfully');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete team', 'error');
    }
  };


  const handleGradeSubmit = async (approved: boolean) => {
    if (!gradingSlot) return;
    setIsGrading(true);
    try {
      await adminGradeArena1Submission(token, gradingSlot.teamId, gradingSlot.slot, approved, gradePoints);
      showToast(`Submission ${approved ? 'approved' : 'rejected'}`);
      await fetchData();
      setGradingSlot(null);
    } catch (err) {
      showToast('Failed to grade submission', 'error');
    } finally {
      setIsGrading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName || !newTeamPassword) return;
    setIsCreating(true);
    try {
      await createAdminArena1Team(token, { name: newTeamName, password: newTeamPassword });
      showToast('Team created successfully');
      setNewTeamName('');
      setNewTeamPassword('');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create Arena 1 team', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartArena = async () => {
    const ok = await confirm({
      title: 'Initialize Arena',
      message: 'Start Arena 1 for ALL teams? This will begin the 15-minute countdown for every team.',
      confirmText: 'Launch Sequence'
    });
    if (!ok) return;
    setIsStarting(true);
    try {
      await adminStartArena1(token);
      showToast('Arena 1 sequence initiated');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to start Arena 1', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndArena = async () => {
    const ok = await confirm({
      title: 'Terminate Arena',
      message: 'Force-end Arena 1 for ALL teams? Any active slots will be auto-skipped.',
      confirmText: 'Terminate'
    });
    if (!ok) return;
    setIsEnding(true);
    try {
      await adminEndArena1(token);
      showToast('Arena 1 sequence terminated');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to end Arena 1', 'error');
    } finally {
      setIsEnding(false);
    }
  };

  const handleShareDiscord = async () => {
    const ok = await confirm({
      title: 'External Broadcast',
      message: 'Post final results to Discord?',
      confirmText: 'Broadcast'
    });
    if (!ok) return;
    try {
      setIsSharing(true);
      await adminPostArena1DiscordReport(token);
      showToast('Tactical report posted to Discord');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to send report', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-[var(--color-accent)]" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-[var(--color-accent)]">Arena 1 Control</h2>
          {/* Game Status Badge */}
          <span className={cn(
            "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
            gameStatus === 'active' ? "bg-green-500/20 text-green-400 border-green-500/40 animate-pulse" :
            gameStatus === 'done'   ? "bg-white/10 text-white/40 border-white/10" :
                                     "bg-amber-500/20 text-amber-400 border-amber-500/40"
          )}>
            {gameStatus === 'active' ? '● LIVE' : gameStatus === 'done' ? '■ FINISHED' : '○ WAITING'}
          </span>
        </div>
        <div className="flex gap-3">
          {gameStatus === 'waiting' && (
            <Button
              onClick={handleStartArena}
              disabled={isStarting || teams.length === 0}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-black font-black text-xs tracking-widest gap-2 uppercase"
            >
              {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Arena 1
            </Button>
          )}
          {gameStatus === 'active' && (
            <Button
              onClick={handleEndArena}
              disabled={isEnding}
              className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 font-black text-xs tracking-widest gap-2 uppercase"
            >
              {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Force End
            </Button>
          )}
          <Button onClick={() => fetchData()} className="bg-transparent border border-white/20 text-xs tracking-widest hover:bg-white/10">REFRESH</Button>
          <Button 
            onClick={handleShareDiscord} 
            disabled={isSharing}
            className="bg-[#5865F2]/20 hover:bg-[#5865F2]/40 text-[#5865F2] border border-[#5865F2]/50 font-black text-xs tracking-widest gap-2 uppercase"
          >
            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            POST TO DISCORD
          </Button>
          <a href={`/api/admin/a1/report/xlsx?token=${token}`} target="_blank" rel="noreferrer">
            <Button className="bg-transparent border border-white/20 text-xs tracking-widest gap-2 hover:bg-white/10">
              <Download className="w-4 h-4" /> EXPORT REPORT
            </Button>
          </a>
        </div>
      </div>

      <div className="flex border-b border-white/10 mb-6">
        <button
          className={cn(
            "px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative",
            activeTab === 'operatives' ? "text-[var(--color-accent)]" : "text-white/40 hover:text-white"
          )}
          onClick={() => setActiveTab('operatives')}
        >
          Operatives
          {activeTab === 'operatives' && (
            <motion.div layoutId="a1-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]" />
          )}
        </button>
        <button
          className={cn(
            "px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative",
            activeTab === 'sequences' ? "text-[var(--color-accent)]" : "text-white/40 hover:text-white"
          )}
          onClick={() => setActiveTab('sequences')}
        >
          Sequences
          {activeTab === 'sequences' && (
            <motion.div layoutId="a1-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]" />
          )}
        </button>
      </div>

      {activeTab === 'operatives' ? (
        <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-black/60 border-white/10 sticky top-8">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 text-[var(--color-accent)] mb-2">
                <Plus className="w-4 h-4" />
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Add A1 Operative</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Team Name</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input 
                    placeholder="TEAM NAME" 
                    value={newTeamName} 
                    onChange={e => setNewTeamName(e.target.value)} 
                    className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11 text-white" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Password</label>
                <div className="relative">
                  <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input 
                    placeholder="PASSWORD" 
                    type="password" 
                    value={newTeamPassword} 
                    onChange={e => setNewTeamPassword(e.target.value)} 
                    className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11 text-white" 
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateTeam} 
                disabled={isCreating || !newTeamName || !newTeamPassword}
                className="w-full bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent)]/80 h-11 font-black uppercase tracking-[0.2em]"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Team'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          {teams.map((team) => (
            <Card key={team._id || team.id} className="bg-black/60 border-white/10">
            <CardHeader className="pb-2 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg text-[var(--color-accent)]">{team.name}</CardTitle>
                <div className="text-xs text-white/50">Score: {team.score} | Status: {team.gameState?.status}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-red-500 hover:bg-red-500/10 p-2"
                onClick={() => handleDeleteTeam(team._id || team.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((slot) => {
                  const result = team.gameState?.slotResults?.find((r: any) => r.slot === slot);
                  const status = !result ? 'pending' 
                               : result.skipped ? 'skipped'
                               : result.submittedAt && result.approved === null ? 'review'
                               : result.approved === true ? 'approved'
                               : result.approved === false ? 'rejected'
                               : 'active';

                  return (
                    <div key={slot} className={cn(
                      "p-3 rounded border flex flex-col gap-2",
                      status === 'review' ? "bg-amber-500/10 border-amber-500/30" :
                      status === 'approved' ? "bg-green-500/10 border-green-500/30" :
                      status === 'rejected' ? "bg-red-500/10 border-red-500/30" :
                      status === 'skipped' ? "bg-white/5 border-white/10 opacity-50" :
                      "bg-white/5 border-white/10"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest">Slot {slot + 1}</span>
                        {status === 'review' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                        {status === 'approved' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                        {status === 'rejected' && <XCircle className="w-3 h-3 text-red-500" />}
                      </div>

                      {status === 'review' && (
                        <Button 
                          size="sm" 
                          className="w-full text-[10px] h-6 bg-amber-500 hover:bg-amber-600 text-black mt-2"
                          onClick={() => setGradingSlot({ teamId: team.id, teamName: team.name, slot, result })}
                        >
                          <Code2 className="w-3 h-3 mr-1" /> Review Code
                        </Button>
                      )}
                      {status === 'approved' && <div className="text-xs text-green-500">+{result?.points} pts</div>}
                      {status === 'skipped' && <div className="text-[10px] text-white/40">Skipped (0 pts)</div>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          ))}
          {teams.length === 0 && (
            <div className="text-center py-20 border border-dashed border-white/10 glass-morphism">
              <Users className="w-12 h-12 text-white/5 mx-auto mb-4" />
              <div className="text-[10px] uppercase tracking-[0.5em] text-white/20">No Arena 1 Operatives detected</div>
            </div>
          )}
        </div>
      </div>
      ) : (
        <Arena1QuestionManagement
          token={token}
          questions={questions}
          onRefresh={() => fetchData(true)}
          onError={(err) => err ? showToast(err, 'error') : null}
        />
      )}

      {/* Grading Modal */}
      {gradingSlot && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-black border border-white/20 rounded-xl overflow-hidden flex flex-col h-[90vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-[var(--color-accent)] tracking-widest uppercase">
                Reviewing: {gradingSlot.teamName} - Slot {gradingSlot.slot + 1}
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-black rounded overflow-hidden border border-white/20 mr-4">
                  <button 
                    className={`px-4 py-1 text-xs tracking-widest uppercase ${viewMode === 'preview' ? 'bg-white/20 text-white font-bold' : 'text-white/50 hover:text-white'}`}
                    onClick={() => setViewMode('preview')}
                  >
                    Preview
                  </button>
                  <button 
                    className={`px-4 py-1 text-xs tracking-widest uppercase ${viewMode === 'code' ? 'bg-white/20 text-white font-bold' : 'text-white/50 hover:text-white'}`}
                    onClick={() => setViewMode('code')}
                  >
                    Code
                  </button>
                </div>
                <Button variant="ghost" onClick={() => { setGradingSlot(null); setViewMode('preview'); }}>Close</Button>
              </div>
            </div>
            
            <div className="flex-1 relative overflow-hidden bg-black flex flex-col">
              {viewMode === 'preview' ? (
                <div className="flex-1 bg-white relative w-full h-full">
                  <iframe 
                    src={`/api/admin/a1/submissions/${gradingSlot.teamId}/${gradingSlot.slot}?token=${token}`}
                    className="w-full h-full border-0 absolute inset-0"
                    title="Submission Preview"
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs text-left whitespace-pre">
                  <code>{codeText}</code>
                </div>
              )}
            </div>

            <div className="p-4 bg-black border-t border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold uppercase tracking-widest">Assign Points:</span>
                <input 
                  type="number" 
                  value={gradePoints} 
                  onChange={(e) => setGradePoints(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 px-3 py-2 w-24 text-center rounded text-white"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleGradeSubmit(false)} 
                  disabled={isGrading}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500/50 uppercase tracking-widest"
                >
                  {isGrading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Reject (0)'}
                </Button>
                <Button 
                  onClick={() => handleGradeSubmit(true)} 
                  disabled={isGrading}
                  className="bg-green-500/20 hover:bg-green-500/40 text-green-500 border border-green-500/50 uppercase tracking-widest"
                >
                  {isGrading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Approve'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
