import { useState } from 'react';
import { Users, Plus, Trash2, Mail, Shield, User, RefreshCw, X, Clock, Target, ShieldCheck, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createAdminTeam, deleteAdminTeam, deleteAllAdminTeams, swapAdminTeamRound } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TeamManagementProps {
  token: string;
  teams: any[];
  onRefresh: () => void;
  onError: (err: string | null) => void;
}

export function TeamManagement({ token, teams, onRefresh, onError }: TeamManagementProps) {
  const [teamName, setTeamName] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamSolverName, setTeamSolverName] = useState('');
  const [teamRunnerName, setTeamRunnerName] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const handleCreateTeam = async () => {
    if (!token || !teamName || !teamEmail || !teamPassword) return;
    setIsCreating(true);
    onError(null);
    try {
      await createAdminTeam(token, { name: teamName, email: teamEmail, password: teamPassword, solverName: teamSolverName, runnerName: teamRunnerName });
      setTeamName('');
      setTeamEmail('');
      setTeamSolverName('');
      setTeamRunnerName('');
      setTeamPassword('');
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!token || !window.confirm('Confirm operative removal?')) return;
    try {
      await deleteAdminTeam(token, id);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete team');
    }
  };

  const handleSwapRound = async (id: string) => {
    if (!token || !window.confirm('FORCE ROUND SWAP? This will replace the team\'s current challenge with one from the Reserve Pool. Points will NOT be deducted for Admin-forced swaps.')) return;
    setIsSwapping(id);
    try {
      await swapAdminTeamRound(token, id);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to swap round');
    } finally {
      setIsSwapping(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!token || !window.confirm('WIPE ALL OPERATIVES? This will clear all progress.')) return;
    try {
      await deleteAllAdminTeams(token);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to wipe teams');
    }
  };

  return (
    <div className="space-y-12">
      {/* Registration Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Operative_Registry</h2>
          <p className="text-[10px] font-mono text-white/80 uppercase tracking-widest">Manage field agents and access nodes</p>
        </div>
        {teams.length > 0 && (
          <Button variant="ghost" onClick={handleDeleteAll} className="text-[10px] uppercase tracking-widest text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10">
            Wipe Registry
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Left: Form */}
        <div className="lg:col-span-1">
          <div className="corner-card glass-morphism p-8 space-y-6 sticky top-8">
            <div className="flex items-center gap-3 text-[var(--color-accent)] mb-2">
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Add_Operative</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Callsign</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input placeholder="OPERATIVE NAME" value={teamName} onChange={e => setTeamName(e.target.value)} className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Identifier (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input placeholder="REGISTRY EMAIL" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Solver Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input placeholder="SOLVER NAME" value={teamSolverName} onChange={e => setTeamSolverName(e.target.value)} className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Runner Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input placeholder="RUNNER NAME" value={teamRunnerName} onChange={e => setTeamRunnerName(e.target.value)} className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.3em] text-white/80 ml-1">Secure_Passkey</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <Input placeholder="PASSWORD" type="password" value={teamPassword} onChange={e => setTeamPassword(e.target.value)} className="bg-white/[0.03] border-white/5 pl-9 text-[10px] uppercase tracking-widest h-11" />
                </div>
              </div>

              <Button 
                onClick={handleCreateTeam} 
                disabled={isCreating || !teamName || !teamEmail || !teamPassword}
                className="w-full btn-primary h-12 font-black uppercase tracking-[0.2em]"
              >
                Register Agent
              </Button>
            </div>
          </div>
        </div>

        {/* Right: List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <Users className="text-[var(--color-accent)] w-4 h-4" />
            <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/80">Active_Registry_Nodes ({teams.length})</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {teams.map((team) => (
              <motion.div
                layout
                key={team.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedTeam(team)}
                className="corner-card p-6 glass-morphism transition-all group cursor-pointer hover:border-[var(--color-accent)]/30"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-8 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 flex flex-col items-center justify-center font-mono text-[10px] text-[var(--color-accent)]">
                    <span className="text-[7px] opacity-50 leading-none mb-0.5">SCORE</span>
                    <span className="leading-none">{team.score || 0}</span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleSwapRound(team.id)}
                      disabled={isSwapping === team.id}
                      className="text-white/10 hover:text-blue-400 transition-colors p-1"
                      title="Force Round Swap"
                    >
                      <RefreshCw className={cn("w-4 h-4", isSwapping === team.id && "animate-spin")} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-white/10 hover:text-[var(--color-accent)] transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-[var(--color-accent)]/60 uppercase tracking-widest">{team.id.slice(-8).toUpperCase()}</div>
                  <div className="font-black uppercase tracking-tight text-lg">{team.name}</div>
                  <div className="text-[10px] font-mono text-white/80 truncate">{team.email || 'NO_EMAIL_IDENTIFIED'}</div>
                  <div className="flex gap-2 mt-1">
                    {team.solverName && <span className="text-[8px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 border border-blue-500/20">S: {team.solverName.toUpperCase()}</span>}
                    {team.runnerName && <span className="text-[8px] font-mono bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-1.5 py-0.5 border border-[var(--color-accent)]/20">R: {team.runnerName.toUpperCase()}</span>}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-mono uppercase tracking-widest text-white/70">
                   <span>Added: {new Date(team.createdAt).toLocaleDateString()}</span>
                   <span className="text-[var(--color-accent)]/40">Status: Active</span>
                </div>
              </motion.div>
            ))}
          </div>

          {!teams.length && (
            <div className="text-center py-20 border border-dashed border-white/10 glass-morphism">
              <Users className="w-12 h-12 text-white/5 mx-auto mb-4" />
              <div className="text-[10px] uppercase tracking-[0.5em] text-white/20">No active operatives detected</div>
            </div>
          )}
        </div>
      </div>

      {/* Team Detail Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTeam(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl corner-card glass-morphism overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[var(--color-accent)] opacity-60">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="text-[8px] font-mono uppercase tracking-[0.4em]">Operative_File</span>
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">{selectedTeam.name}</h2>
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{selectedTeam.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedTeam(null)}
                    className="p-2 text-white/20 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white/[0.03] border border-white/5 corner-card">
                    <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest mb-1">Total Score</div>
                    <div className="text-2xl font-black text-[var(--color-accent)]">{selectedTeam.score || 0}</div>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-white/5 corner-card">
                    <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest mb-1">Current Round</div>
                    <div className="text-2xl font-black text-white">R{(selectedTeam.gameState?.round || 0) + 1}</div>
                  </div>
                  <div className="p-4 bg-white/[0.03] border border-white/5 corner-card">
                    <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest mb-1">Mission Stage</div>
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">{selectedTeam.gameState?.stage?.replace('_', ' ') || 'INITIALIZING'}</div>
                  </div>
                </div>
              </div>

              {/* Content - Players & Logs */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Players Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4 opacity-40">
                    <Users className="w-3 h-3" />
                    <h3 className="text-[10px] font-mono uppercase tracking-[0.3em]">Personnel_Profiles</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 glass-morphism border-blue-500/10">
                      <div className="text-[8px] font-mono text-blue-400/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Solver
                      </div>
                      <div className="font-bold uppercase tracking-widest text-sm">{selectedTeam.solverName || 'UNASSIGNED'}</div>
                    </div>
                    <div className="p-4 glass-morphism border-[var(--color-accent)]/10">
                      <div className="text-[8px] font-mono text-[var(--color-accent)]/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Runner
                      </div>
                      <div className="font-bold uppercase tracking-widest text-sm">{selectedTeam.runnerName || 'UNASSIGNED'}</div>
                    </div>
                  </div>
                </section>

                {/* Score History Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 opacity-40">
                      <Clock className="w-3 h-3" />
                      <h3 className="text-[10px] font-mono uppercase tracking-[0.3em]">Tactical_Logs</h3>
                    </div>
                    <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Chronological_Order</div>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedTeam.scoreHistory && selectedTeam.scoreHistory.length > 0 ? (
                      [...selectedTeam.scoreHistory].reverse().map((log: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                          <div className={cn(
                            "w-12 text-center font-black text-sm",
                            log.amount >= 0 ? "text-emerald-400" : "text-red-500"
                          )}>
                            {log.amount >= 0 ? '+' : ''}{log.amount}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/80 truncate">
                              {log.reason}
                            </div>
                            <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Target className="w-3 h-3 text-white/10" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 border border-dashed border-white/5 rounded-lg">
                        <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">No logs recorded for this node</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-[8px] font-mono text-white/40 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connection_Stable
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setSelectedTeam(null)}
                  className="text-[10px]"
                >
                  Close_File
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
