import { useState } from 'react';
import { Users, Plus, Trash2, Mail, Shield, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createAdminTeam, deleteAdminTeam, deleteAllAdminTeams } from '@/lib/api';

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
                className="corner-card p-6 glass-morphism transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-8 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 flex flex-col items-center justify-center font-mono text-[10px] text-[var(--color-accent)]">
                    <span className="text-[7px] opacity-50 leading-none mb-0.5">SCORE</span>
                    <span className="leading-none">{team.score || 0}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTeam(team.id)}
                    className="text-white/10 hover:text-[var(--color-accent)] transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-[var(--color-accent)]/60 uppercase tracking-widest">{team.id.slice(-8).toUpperCase()}</div>
                  <div className="font-black uppercase tracking-tight text-lg">{team.name}</div>
                  <div className="text-[10px] font-mono text-white/80 truncate">{team.email || 'NO_EMAIL_IDENTIFIED'}</div>
                  <div className="flex gap-2 mt-1">
                    {team.solverName && <span className="text-[8px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">S: {team.solverName.toUpperCase()}</span>}
                    {team.runnerName && <span className="text-[8px] font-mono bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">R: {team.runnerName.toUpperCase()}</span>}
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
    </div>
  );
}
