import { useState } from 'react';
import { 
  Settings, 
  MessageSquare, 
  ShieldAlert, 
  Plus, 
  X, 
  Database,
  RefreshCw,
  Power
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateAdminConfig, wipeAdminDatabase } from '@/lib/api';

interface ConfigManagementProps {
  token: string;
  config: any;
  onRefresh: () => void;
  onError: (err: string | null) => void;
}

export function ConfigManagement({ token, config, onRefresh, onError }: ConfigManagementProps) {
  const [newPhrase, setNewPhrase] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleLogin = async () => {
    if (!token) return;
    try {
      const newVal = !config?.loginEnabled;
      await updateAdminConfig(token, 'loginEnabled', newVal);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update config');
    }
  };

  const handleAddPhrase = async () => {
    if (!token || !newPhrase.trim()) return;
    setIsUpdating(true);
    try {
      const updatedPhrases = [...(config?.tacticalPhrases || []), newPhrase.trim()];
      await updateAdminConfig(token, 'tacticalPhrases', updatedPhrases);
      setNewPhrase('');
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add phrase');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePhrase = async (idx: number) => {
    if (!token) return;
    try {
      const updatedPhrases = config.tacticalPhrases.filter((_: any, i: number) => i !== idx);
      await updateAdminConfig(token, 'tacticalPhrases', updatedPhrases);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete phrase');
    }
  };

  const handleWipeDatabase = async () => {
    if (!token || !window.confirm('WIPE ENTIRE DATABASE? This will delete all teams and questions. IRREVERSIBLE.')) return;
    try {
      await wipeAdminDatabase(token);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to wipe database');
    }
  };

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
              <div className="corner-card glass-morphism p-8 flex justify-between items-center group">
                 <div className="space-y-1">
                   <h4 className="font-black uppercase tracking-widest text-sm">Operative Authentication</h4>
                   <p className="text-[10px] font-mono text-white/60 uppercase tracking-tight max-w-[280px]">
                     Enable or disable team login globally across all nodes.
                   </p>
                 </div>
                 <button
                   onClick={handleToggleLogin}
                   className={`relative inline-flex h-8 w-14 items-center transition-all focus:outline-none ${
                     config?.loginEnabled ? 'bg-[var(--color-accent)]' : 'bg-white/10'
                   }`}
                 >
                   <span className={`inline-block h-6 w-6 transform bg-white transition-transform ${
                     config?.loginEnabled ? 'translate-x-7 bg-black' : 'translate-x-1'
                   }`} />
                 </button>
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
