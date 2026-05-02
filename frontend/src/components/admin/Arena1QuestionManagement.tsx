import { useState } from 'react';
import { Plus, Trash2, Edit3, X, Terminal, Code, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createAdminArena1Question,
  updateAdminArena1Question,
  deleteAdminArena1Question,
  type Arena1Question,
  type Arena1SlotType
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAdminToast } from '@/contexts/AdminToastContext';

interface Arena1QuestionManagementProps {
  token: string;
  questions: Arena1Question[];
  onRefresh: () => void;
  onError: (err: string | null) => void;
}

function createEmptyQuestion(nextSlot: number): Arena1Question {
  return {
    slot: nextSlot,
    type: 'html',
    title: '',
    description: '',
    starterHtml: '',
    starterCss: '',
    starterJs: '',
    defaultCode: '',
    points: 100,
    isReserve: false
  };
}

export function Arena1QuestionManagement({ token, questions, onRefresh, onError }: Arena1QuestionManagementProps) {
  const { showToast, confirm } = useAdminToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Arena1Question>(createEmptyQuestion(questions.length));
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (q: Arena1Question) => {
    setEditingId(q.id || q._id || null);
    setDraft({ ...q });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    onError(null);
    try {
      if (editingId) {
        await updateAdminArena1Question(token, editingId, draft);
      } else {
        await createAdminArena1Question(token, draft);
      }
      showToast(`Arena 1 sequence ${editingId ? 'updated' : 'created'} successfully`);
      setEditingId(null);
      setDraft(createEmptyQuestion(questions.length + 1));
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save Arena 1 question', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const ok = await confirm({
      title: 'Delete A1 Node',
      message: 'Are you sure you want to delete this Arena 1 sequence node?',
      confirmText: 'Delete'
    });
    if (!ok) return;
    try {
      await deleteAdminArena1Question(token, id);
      showToast('Arena 1 node deleted');
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete Arena 1 question', 'error');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setDraft(createEmptyQuestion(questions.length));
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">A1_Sequence_Architect</h2>
        <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Manage slots and technical challenges for Arena 1</p>
      </div>

      <div className="grid xl:grid-cols-5 gap-12">
        {/* Editor Form */}
        <div className="xl:col-span-3">
          <div className="corner-card glass-morphism p-8 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-[var(--color-accent)]/20 uppercase tracking-[0.3em]">
              Architect_Mode: {editingId ? 'Modify' : 'Create'}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Side: General Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-[var(--color-accent)] mb-2">
                  <Terminal className="w-4 h-4" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Slot_Params</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Slot Index (0-3)</label>
                    <Input type="number" value={draft.slot ?? 0} onChange={e => setDraft({ ...draft, slot: Number(e.target.value) })} className="bg-white/[0.03] border-white/5 h-11 font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Max Points</label>
                    <Input type="number" value={draft.points ?? 100} onChange={e => setDraft({ ...draft, points: Number(e.target.value) })} className="bg-white/[0.03] border-white/5 h-11 font-mono text-xs" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Slot Type</label>
                  <select
                    value={draft.type}
                    onChange={e => setDraft({ ...draft, type: e.target.value as Arena1SlotType })}
                    className="w-full bg-[#0a0a0a] border border-white/10 h-11 px-3 text-xs uppercase font-mono text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors [&>option]:bg-[#1a1a1a]"
                  >
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="js">JS</option>
                    <option value="combined">COMBINED</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Title</label>
                  <Input placeholder="MISSION_TITLE" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="bg-white/[0.03] border-white/5 text-[10px] uppercase h-11" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Is Reserve?</label>
                  <div className="flex items-center gap-2 h-11 px-3 bg-white/[0.03] border border-white/5">
                    <input type="checkbox" checked={draft.isReserve || false} onChange={e => setDraft({ ...draft, isReserve: e.target.checked })} />
                    <span className="text-[10px] uppercase text-white/70 tracking-widest">Reserve Node</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Puzzle Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-[var(--color-accent)] mb-2">
                  <Code className="w-4 h-4" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Puzzle_Matrix</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Description (Markdown)</label>
                    <textarea
                      placeholder="DESCRIPTION..."
                      value={draft.description}
                      onChange={e => setDraft({ ...draft, description: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 p-4 font-mono text-xs min-h-[100px] focus:outline-none focus:border-[var(--color-accent)]/30 transition-colors resize-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Default / Starter Code (HTML/JS/CSS)</label>
                    <textarea
                      placeholder="STARTER HTML"
                      value={draft.starterHtml || ''}
                      onChange={e => setDraft({ ...draft, starterHtml: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 p-2 font-mono text-xs h-20 focus:outline-none focus:border-[var(--color-accent)]/30 transition-colors resize-y mb-2"
                    />
                    <textarea
                      placeholder="STARTER CSS"
                      value={draft.starterCss || ''}
                      onChange={e => setDraft({ ...draft, starterCss: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 p-2 font-mono text-xs h-20 focus:outline-none focus:border-[var(--color-accent)]/30 transition-colors resize-y mb-2"
                    />
                    <textarea
                      placeholder="STARTER JS"
                      value={draft.starterJs || ''}
                      onChange={e => setDraft({ ...draft, starterJs: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 p-2 font-mono text-xs h-20 focus:outline-none focus:border-[var(--color-accent)]/30 transition-colors resize-y mb-2"
                    />
                    <textarea
                      placeholder="LEGACY DEFAULT CODE"
                      value={draft.defaultCode || ''}
                      onChange={e => setDraft({ ...draft, defaultCode: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 p-2 font-mono text-xs h-20 focus:outline-none focus:border-[var(--color-accent)]/30 transition-colors resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 btn-primary h-14 font-black uppercase tracking-[0.3em]">
                {editingId ? 'Update Sequence' : 'Initialize Sequence'}
              </Button>
              {editingId && (
                <Button onClick={handleCancel} variant="ghost" className="h-14 px-8 text-white/60 hover:text-white uppercase tracking-widest border border-white/5">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Question Lists */}
        <div className="xl:col-span-2 space-y-12">
          {/* Active Stack */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Terminal className="text-[var(--color-accent)] w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Active_A1_Stack</h3>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {questions.filter(q => !q.isReserve).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map((q) => {
                const qId = q.id || q._id;
                return (
                  <motion.div
                    layout
                    key={qId}
                    className="corner-card p-6 glass-morphism hover:border-[var(--color-accent)]/20 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl relative">
                          {q.slot}
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                            {q.title}
                          </div>
                          <div className="text-[8px] font-mono text-white/60 uppercase tracking-widest mb-1">Slot_Index: {q.slot}</div>
                          <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest">{qId?.slice(-8).toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(q)} className="p-2 text-white/30 hover:text-white transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(qId!)} className="p-2 text-white/10 hover:text-[var(--color-accent)] transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <div className="text-[8px] uppercase text-white/40 tracking-widest font-mono">Target_Type</div>
                        <div className="text-[10px] font-bold text-white/60 truncate uppercase">{q.type}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] uppercase text-white/40 tracking-widest font-mono">Points</div>
                        <div className="text-[10px] font-mono text-[var(--color-accent)]/80">{q.points ?? 100} pts</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {!questions.filter(q => !q.isReserve).length && (
                <div className="text-center py-10 border border-dashed border-white/10 glass-morphism">
                  <Terminal className="w-8 h-8 text-white/5 mx-auto mb-2" />
                  <div className="text-[10px] uppercase tracking-[0.5em] text-white/20">A1 stack is empty</div>
                </div>
              )}
            </div>
          </div>

          {/* Reserve Pool */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6 pt-6 border-t border-white/5">
              <Settings className="text-amber-500 w-4 h-4" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Reserve_A1_Pool</h3>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {questions.filter(q => q.isReserve).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map((q) => {
                const qId = q.id || q._id;
                return (
                  <motion.div
                    layout
                    key={qId}
                    className="corner-card p-6 glass-morphism border-amber-500/30 hover:border-amber-500/50 bg-amber-500/[0.02] transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black text-xl relative">
                          {q.slot}
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-black font-black">
                            R
                          </div>
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                            {q.title}
                          </div>
                          <div className="text-[8px] font-mono text-white/60 uppercase tracking-widest mb-1">Slot_Index: {q.slot}</div>
                          <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest">{qId?.slice(-8).toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(q)} className="p-2 text-amber-500/50 hover:text-amber-500 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(qId!)} className="p-2 text-white/10 hover:text-amber-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-500/10">
                      <div className="space-y-1">
                        <div className="text-[8px] uppercase text-white/40 tracking-widest font-mono">Target_Type</div>
                        <div className="text-[10px] font-bold text-white/60 truncate uppercase">{q.type}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] uppercase text-white/40 tracking-widest font-mono">Points</div>
                        <div className="text-[10px] font-mono text-amber-500/80">{q.points ?? 100} pts</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {!questions.filter(q => q.isReserve).length && (
                <div className="text-center py-10 border border-dashed border-amber-500/10 glass-morphism bg-amber-500/[0.01]">
                  <Settings className="w-8 h-8 text-amber-500/20 mx-auto mb-2" />
                  <div className="text-[10px] uppercase tracking-[0.5em] text-amber-500/40">Reserve pool is empty</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
