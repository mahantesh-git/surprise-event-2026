import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  MessageSquare,
  ShieldAlert,
  Plus,
  X,
  Database,
  RefreshCw,
  Power,
  Zap,
  Target,
  Cpu,
  Smartphone,
  KeyRound,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateAdminConfig, wipeAdminDatabase } from '@/lib/api';
import { useAdminToast } from '@/contexts/AdminToastContext';

interface ConfigManagementProps {
  token: string;
  config: any;
  onRefresh: () => void;
  onError: (err: string | null) => void;
}

export function ConfigManagement({ token, config, onRefresh, onError }: ConfigManagementProps) {
  const { showToast, confirm } = useAdminToast();
  const [newPhrase, setNewPhrase] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleLogin = async () => {
    if (!token) return;
    try {
      const newVal = !config?.loginEnabled;
      await updateAdminConfig(token, 'loginEnabled', newVal);
      showToast(`Login ${newVal ? 'ENABLED' : 'DISABLED'}`);
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update config', 'error');
    }
  };

  const handleUpdateProtocol = async (val: string) => {
    if (!token) return;
    try {
      await updateAdminConfig(token, 'difficultyProtocol', val);
      showToast(`Protocol updated to: ${val.toUpperCase()}`);
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update protocol', 'error');
    }
  };

  const handleAddPhrase = async () => {
    if (!token || !newPhrase.trim()) return;
    setIsUpdating(true);
    try {
      const updatedPhrases = [...(config?.tacticalPhrases || []), newPhrase.trim()];
      await updateAdminConfig(token, 'tacticalPhrases', updatedPhrases);
      setNewPhrase('');
      showToast('Tactical phrase added');
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add phrase', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePhrase = async (idx: number) => {
    if (!token) return;
    try {
      const updatedPhrases = config.tacticalPhrases.filter((_: any, i: number) => i !== idx);
      await updateAdminConfig(token, 'tacticalPhrases', updatedPhrases);
      showToast('Tactical phrase removed');
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete phrase', 'error');
    }
  };

  const handleWipeDatabase = async () => {
    if (!token) return;
    const ok = await confirm({
      title: 'IRREVERSIBLE PURGE',
      message: 'WIPE ENTIRE DATABASE? This will delete all teams, questions, and configs. This cannot be undone.',
      confirmText: 'Execute Purge'
    });
    if (!ok) return;
    try {
      await wipeAdminDatabase(token);
      showToast('DATABASE PURGED');
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to wipe database', 'error');
    }
  };

  // ── DEVICE LOCK STATE ────────────────────────────────────────────────────
  const [bypassKey, setBypassKey] = useState('');
  const [bypassKeyLoading, setBypassKeyLoading] = useState(false);
  const [bypassKeyCopied, setBypassKeyCopied] = useState(false);

  const fetchBypassKey = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_HOST || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/admin/device-bypass-key`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setBypassKey(data.bypassKey || '');
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { void fetchBypassKey(); }, [fetchBypassKey]);

  const handleGenerateBypassKey = async () => {
    if (!token) return;
    setBypassKeyLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_HOST || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/admin/device-bypass-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setBypassKey(data.bypassKey || '');
    } catch (err) {
      onError('Failed to generate bypass key');
    } finally {
      setBypassKeyLoading(false);
    }
  };

  const handleClearBypassKey = async () => {
    if (!token) return;
    try {
      await fetch(`${import.meta.env.VITE_API_HOST || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/admin/device-bypass-key`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBypassKey('');
    } catch { onError('Failed to clear bypass key'); }
  };

  const handleClearAllDeviceLocks = async () => {
    if (!token) return;
    const ok = await confirm({
      title: 'Device Security',
      message: 'Clear device locks for ALL teams? They will need to log in again.',
      confirmText: 'Clear All'
    });
    if (!ok) return;
    try {
      await fetch(`${import.meta.env.VITE_API_HOST || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/admin/clear-device-lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'all' }),
      });
      showToast('All device locks cleared');
      onRefresh();
    } catch { showToast('Failed to clear device locks', 'error'); }
  };

  const handleCopyKey = () => {
    if (!bypassKey) return;
    navigator.clipboard.writeText(bypassKey).then(() => {
      setBypassKeyCopied(true);
      setTimeout(() => setBypassKeyCopied(false), 2000);
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Systems_Configuration</h2>
        <p className="text-[10px] font-mono text-white/60 uppercase tracking-widest">Global engine settings and tactical comms management</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Left: Global Controls */}
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <Power className="text-[var(--color-accent)] w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Access_Control</h3>
            </div>
            <div className="corner-card glass-morphism p-8 flex flex-col gap-8 group">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-black uppercase tracking-widest text-sm">Operative Authentication</h4>
                  <p className="text-[10px] font-mono text-white/60 uppercase tracking-tight max-w-[280px]">
                    Enable or disable team login globally across all nodes.
                  </p>
                </div>
                <button
                  onClick={handleToggleLogin}
                  className={`relative inline-flex h-8 w-14 items-center transition-all focus:outline-none ${config?.loginEnabled ? 'bg-[var(--color-accent)]' : 'bg-white/10'
                    }`}
                >
                  <span className={`inline-block h-6 w-6 transform bg-white transition-transform ${config?.loginEnabled ? 'translate-x-7 bg-black' : 'translate-x-1'
                    }`} />
                </button>
              </div>

              <div className="h-[1px] w-full bg-white/5" />

              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-black uppercase tracking-widest text-sm text-[var(--color-accent)]">AR Testing Geofence Bypass</h4>
                  <p className="text-[10px] font-mono text-white/60 uppercase tracking-tight max-w-[280px]">
                    Globally disable 25m distance enforcement and exact QR matching for testing.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!token) return;
                    try {
                      const newVal = !config?.arTestingBypassEnabled;
                      await updateAdminConfig(token, 'arTestingBypassEnabled', newVal);
                      showToast(`AR Bypass ${newVal ? 'ENABLED' : 'DISABLED'}`);
                      onRefresh();
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : 'Failed to update config', 'error');
                    }
                  }}
                  className={`relative inline-flex h-8 w-14 items-center transition-all focus:outline-none ${config?.arTestingBypassEnabled ? 'bg-red-500' : 'bg-white/10'
                    }`}
                >
                  <span className={`inline-block h-6 w-6 transform bg-white transition-transform ${config?.arTestingBypassEnabled ? 'translate-x-7 bg-black' : 'translate-x-1'
                    }`} />
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <Cpu className="text-[var(--color-accent)] w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Global_Difficulty_Protocol</h3>
            </div>
            <div className="corner-card glass-morphism p-8 space-y-6">
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-widest text-sm">Target Difficulty Scheduling</h4>
                <p className="text-[10px] font-mono text-white/60 uppercase tracking-tight">
                  Forces the difficulty for the <span className="text-[var(--color-accent)]">NEXT ROUND</span> of all teams.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                {[
                  { id: 'auto', label: 'AUTO', icon: RefreshCw, desc: 'Protocol Zero' },
                  { id: 'normal', label: 'NORMAL', icon: Target, desc: 'Protocol Alpha' },
                  { id: 'hard', label: 'HARD', icon: Zap, desc: 'Protocol Omega' },
                ].map((mode) => {
                  const isActive = (config?.difficultyProtocol || 'auto') === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleUpdateProtocol(mode.id)}
                      className={`flex flex-col items-center gap-3 p-4 border transition-all ${isActive
                          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-white'
                          : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                        }`}
                    >
                      <mode.icon className={`w-5 h-5 ${isActive ? 'text-[var(--color-accent)] animate-pulse' : ''}`} />
                      <div className="text-center">
                        <div className="text-[10px] font-black tracking-widest">{mode.label}</div>
                        <div className="text-[8px] font-mono uppercase opacity-50">{mode.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <Database className="text-[var(--color-accent)] w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Data_Destruction</h3>
            </div>
            <div className="corner-card glass-morphism border-[var(--color-accent)]/20 p-8 flex justify-between items-center">
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-widest text-sm text-[var(--color-accent)]">Database Purge</h4>
                <p className="text-[10px] font-mono text-[var(--color-accent)]/60 uppercase tracking-tight max-w-[280px]">
                  Irreversibly wipe all team data, questions, and system logs.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={handleWipeDatabase}
                className="h-12 px-8 font-black uppercase tracking-[0.2em] text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20"
              >
                EXECUTE_WIPE
              </Button>
            </div>
          </section>

          {/* ── DEVICE LOCK MANAGEMENT ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <Smartphone className="text-[var(--color-accent)] w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-[var(--color-accent)]/80">Device_Lock_Management</h3>
            </div>
            <div className="corner-card glass-morphism border-[var(--color-accent)]/20 p-8 space-y-6">
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-widest text-sm text-[var(--color-accent)]">First-Device Lock</h4>
                <p className="text-[10px] font-mono text-white/50 uppercase tracking-tight max-w-[340px]">
                  The first device to log into a team+role is locked in. A second device needs the bypass key below.
                  Different roles on the same team are always allowed.
                </p>
              </div>

              {/* Current Bypass Key */}
              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--color-accent)]/60">Current Override Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 px-4 py-3 font-mono text-sm tracking-[0.3em] uppercase text-[var(--color-accent)]">
                    {bypassKey || <span className="text-white/20 text-xs tracking-widest">NOT SET — bypass disabled</span>}
                  </div>
                  {bypassKey && (
                    <button
                      onClick={handleCopyKey}
                      className="p-3 border border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/50 text-[var(--color-accent)]/60 hover:text-[var(--color-accent)] transition-all"
                      title="Copy key"
                    >
                      {bypassKeyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  onClick={handleGenerateBypassKey}
                  disabled={bypassKeyLoading}
                  className="h-10 px-5 font-mono text-[10px] tracking-widest uppercase text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/10"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-2" />
                  {bypassKeyLoading ? 'Generating...' : 'Generate Key'}
                </Button>
                {bypassKey && (
                  <Button
                    variant="ghost"
                    onClick={handleClearBypassKey}
                    className="h-10 px-5 font-mono text-[10px] tracking-widest uppercase text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60"
                  >
                    <X className="w-3.5 h-3.5 mr-2" />
                    Clear Key
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={handleClearAllDeviceLocks}
                  className="h-10 px-5 font-mono text-[10px] tracking-widest uppercase text-[var(--color-accent)]/70 border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Clear All Locks
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Tactical Comms */}
        <div className="space-y-8">
          <section className="space-y-4 h-full">
            <div className="flex items-center gap-4">
              <MessageSquare className="text-[var(--color-accent)] w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Tactical_Comms_Presets</h3>
            </div>
            <div className="corner-card glass-morphism p-8 space-y-6 h-[calc(100%-48px)] flex flex-col">
              <div className="flex gap-2">
                <Input
                  placeholder="NEW HUD MESSAGE..."
                  value={newPhrase}
                  onChange={e => setNewPhrase(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPhrase()}
                  className="bg-white/[0.03] border-white/5 h-12 text-[10px] uppercase tracking-widest flex-1"
                />
                <Button onClick={handleAddPhrase} disabled={isUpdating || !newPhrase} className="h-12 w-12 btn-primary p-0">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                {(config?.tacticalPhrases || []).map((phrase: string, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-all">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/80">{phrase}</span>
                    <button onClick={() => handleDeletePhrase(idx)} className="text-white/10 hover:text-[var(--color-accent)] transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {!config?.tacticalPhrases?.length && (
                  <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 bg-white/[0.03] py-12">
                    <MessageSquare className="w-8 h-8 text-white/5 mb-2" />
                    <span className="text-[8px] uppercase tracking-[0.4em] text-white/40">No preset phrases defined</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
