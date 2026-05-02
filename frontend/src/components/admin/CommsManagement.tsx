import React, { useState, useEffect } from 'react';
import { Send, ShieldAlert, CheckCircle2, MessageSquare, Settings, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sendAdminChatMessage, getAdminPhrases, createAdminPhrase, deleteAdminPhrase } from '@/lib/api';
import { useAdminToast } from '@/contexts/AdminToastContext';

interface CommsManagementProps {
  token: string;
  teams: any[];
}

export function CommsManagement({ token, teams }: CommsManagementProps) {
  const { showToast } = useAdminToast();
  const [targetTeamId, setTargetTeamId] = useState<string>('all');
  const [targetRole, setTargetRole] = useState<'runner' | 'solver' | 'all'>('all');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [phrases, setPhrases] = useState<{ _id?: string, id?: string, text: string }[]>([]);
  const [isManaging, setIsManaging] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');

  useEffect(() => {
    loadPhrases();
  }, []);

  const loadPhrases = async () => {
    try {
      const data = await getAdminPhrases(token);
      setPhrases(data.phrases || []);
    } catch (e) {
      console.error('Failed to load phrases', e);
    }
  };

  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) return;
    try {
      await createAdminPhrase(token, newPhrase.trim());
      setNewPhrase('');
      await loadPhrases();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePhrase = async (id: string) => {
    try {
      await deleteAdminPhrase(token, id);
      await loadPhrases();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendAdminChatMessage(token, { text: text.trim(), targetTeamId, targetRole });
      showToast('Command transmitted successfully');
      setText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Transmission failed', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-black uppercase tracking-tighter text-white mb-1">Tactical Comms Override</h2>
        <p className="text-xs text-white/80 uppercase tracking-widest">Broadcast direct messages to operatives in the field.</p>
      </div>

      <Card className="glass-morphism border-white/10">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-sm font-bold tracking-widest uppercase text-[var(--color-accent)] flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Command Center Transmission
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/70 font-bold block">
                Target Squadron
              </label>
              <select
                value={targetTeamId}
                onChange={(e) => setTargetTeamId(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 h-10 px-3 text-xs text-white outline-none focus:border-[var(--color-accent)]/50 uppercase [&>option]:bg-[#1a1a1a] [&>option]:text-white clip-oct"
              >
                <option value="all">{">>>"} ALL SQUADRONS (GLOBAL) {"<<<"}</option>
                {teams.map(t => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name} [{t.gameState?.stage || 'UNKNOWN'}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/70 font-bold block">
                Target Operative Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="w-full bg-[#0a0a0a] border border-white/10 h-10 px-3 text-xs text-white outline-none focus:border-[var(--color-accent)]/50 uppercase [&>option]:bg-[#1a1a1a] [&>option]:text-white clip-oct"
              >
                <option value="all">ALL OPERATIVES</option>
                <option value="runner">
                  FIELD RUNNER {targetTeamId !== 'all' && teams.find(t => (t.id || t._id) === targetTeamId)?.runnerName ? `(${teams.find(t => (t.id || t._id) === targetTeamId)?.runnerName})` : 'ONLY'}
                </option>
                <option value="solver">
                  HQ SOLVER {targetTeamId !== 'all' && teams.find(t => (t.id || t._id) === targetTeamId)?.solverName ? `(${teams.find(t => (t.id || t._id) === targetTeamId)?.solverName})` : 'ONLY'}
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] uppercase tracking-widest text-white/70 font-bold block">
                Message Payload
              </label>
              <button
                onClick={() => setIsManaging(!isManaging)}
                className="text-[10px] uppercase tracking-widest text-white/60 hover:text-[var(--color-accent)] font-bold flex items-center gap-1 transition-colors"
              >
                <Settings className="w-3 h-3" />
                {isManaging ? 'Done' : 'Manage Quick Phrases'}
              </button>
            </div>
            
            {isManaging ? (
              <div className="bg-black/40 border border-white/5 p-3 space-y-3 mb-3 clip-oct">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    placeholder="Add new quick phrase..."
                    className="flex-1 bg-black/60 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-accent)]/50 transition-all placeholder:text-white/20 clip-oct"
                  />
                  <button 
                    onClick={handleAddPhrase} 
                    disabled={!newPhrase.trim()} 
                    className="bg-white/10 hover:bg-white/20 text-white px-4 disabled:opacity-50 transition-all flex items-center justify-center border border-white/5 clip-oct"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {phrases.map((p) => (
                    <div key={p.id || p._id} className="flex justify-between items-center gap-2 group">
                      <span className="text-[10px] text-white/70 truncate">{p.text}</span>
                      <button 
                        onClick={() => handleDeletePhrase(p.id || p._id as string)}
                        className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {phrases.length === 0 && <div className="text-[10px] text-white/30 italic">No custom phrases saved.</div>}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                {phrases.map((p) => (
                  <button
                    key={p.id || p._id}
                    onClick={() => setText(p.text)}
                    className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 px-2 py-1 transition-colors text-left clip-oct"
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Select a quick phrase or enter custom transmission..."
              className="w-full bg-black/50 border border-white/10 min-h-[100px] p-3 text-sm text-white outline-none focus:border-[var(--color-accent)]/50 resize-y clip-oct"
            />
          </div>

          <Button 
            onClick={handleSend} 
            disabled={!text.trim() || sending}
            className="w-full btn-primary h-12 uppercase tracking-widest font-bold"
          >
            {sending ? 'Transmitting...' : 'Initiate Broadcast'}
            {!sending && <Send className="ml-2 w-4 h-4" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
