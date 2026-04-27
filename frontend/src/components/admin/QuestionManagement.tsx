import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Terminal,
  MapPin,
  Code,
  User,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  deleteAllAdminQuestions,
  type RoundQuestion,
  type QuestionLanguage
} from '@/lib/api';
import { LANGUAGE_OPTIONS } from '@/components/CodeEditor';

interface QuestionManagementProps {
  token: string;
  questions: RoundQuestion[];
  onRefresh: () => void;
  onError: (err: string | null) => void;
}

function buildLocationQrCode(round: number) {
  return `QUEST-LOC-R${Math.max(1, Math.trunc(round || 1))}`;
}

function createEmptyQuestion(nextRound: number): RoundQuestion {
  return {
    id: '',
    round: nextRound,
    p1: { title: '', code: '', hint: '', ans: '', output: '', language: 'python', testCases: [] },
    coord: { lat: '', lng: '', place: '' },
    volunteer: { name: '', initials: '', bg: 'bg-[var(--color-accent)]/10', color: 'text-[var(--color-accent)]' },
    qrPasskey: '',
    locationQrCode: '',
    cx: 0.5,
    cy: 0.5,
  };
}

export function QuestionManagement({ token, questions, onRefresh, onError }: QuestionManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoundQuestion>(createEmptyQuestion(questions.length + 1));
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (q: RoundQuestion) => {
    setEditingId(q.id || null);
    setDraft({ ...q, locationQrCode: q.locationQrCode || buildLocationQrCode(q.round) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    onError(null);
    try {
      if (editingId) {
        await updateAdminQuestion(token, editingId, draft);
      } else {
        await createAdminQuestion(token, draft);
      }
      setEditingId(null);
      setDraft(createEmptyQuestion(questions.length + 1));
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm('Delete sequence?')) return;
    try {
      await deleteAdminQuestion(token, id);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setDraft(createEmptyQuestion(questions.length + 1));
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Sequence_Architect</h2>
          <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Architect tactical sequences and mission nodes</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm('PURGE ALL SEQUENCES?')) deleteAllAdminQuestions(token).then(onRefresh);
          }}
          className="text-[10px] uppercase tracking-widest text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
        >
          Purge Sequences
        </Button>
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
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Global_Params</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Stage_Sequence</label>
                    <Input type="number" value={draft.round} onChange={e => setDraft({ ...draft, round: Number(e.target.value) })} className="bg-white/[0.03] border-white/5 h-11 font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Validation_Key</label>
                    <Input placeholder="PASSKEY_01" value={draft.qrPasskey} onChange={e => setDraft({ ...draft, qrPasskey: e.target.value })} className="bg-white/[0.03] border-white/5 h-11 font-mono text-xs uppercase" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] uppercase tracking-[0.3em] text-white/70 ml-1">Location_Vector_QR</label>
                  <Input readOnly value={draft.locationQrCode || buildLocationQrCode(draft.round)} className="bg-white/[0.03] border-white/5 h-11 font-mono text-xs text-[var(--color-accent)]/80" />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 text-white/80 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Field_Coordinates</span>
                  </div>
                  <Input placeholder="DESTINATION_NAME" value={draft.coord.place} onChange={e => setDraft({ ...draft, coord: { ...draft.coord, place: e.target.value } })} className="bg-white/[0.03] border-white/5 text-[10px] uppercase h-10" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="LAT" value={draft.coord.lat} onChange={e => setDraft({ ...draft, coord: { ...draft.coord, lat: e.target.value } })} className="bg-white/[0.03] border-white/5 text-[10px] h-10 font-mono" />
                    <Input placeholder="LNG" value={draft.coord.lng} onChange={e => setDraft({ ...draft, coord: { ...draft.coord, lng: e.target.value } })} className="bg-white/[0.03] border-white/5 text-[10px] h-10 font-mono" />
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
                  <Input placeholder="MISSION_TITLE" value={draft.p1.title} onChange={e => setDraft({ ...draft, p1: { ...draft.p1, title: e.target.value } })} className="bg-white/[0.03] border-white/5 text-[10px] uppercase h-11" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                      value={draft.p1.language || 'python'}
                      onChange={e => setDraft({ ...draft, p1: { ...draft.p1, language: e.target.value as any } })}
                      className="bg-[#0a0a0a] border border-white/10 h-10 px-3 text-[10px] uppercase font-mono text-white focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                    >
                      {LANGUAGE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                    <Input placeholder="EXPECTED_STDOUT" value={draft.p1.ans} onChange={e => setDraft({ ...draft, p1: { ...draft.p1, ans: e.target.value } })} className="bg-white/[0.03] border-white/5 text-[10px] h-10" />
                  </div>

                  <textarea
                    placeholder="SIMULATION_CODE"
                    value={draft.p1.code}
                    onChange={e => setDraft({ ...draft, p1: { ...draft.p1, code: e.target.value } })}
                    className="w-full bg-white/[0.03] border border-white/5 p-4 font-mono text-xs min-h-[160px] focus:outline-none focus:border-[var(--color-accent)]/30 transition-colors resize-none"
                  />

                  <Input placeholder="INTEL_HINT" value={draft.p1.hint} onChange={e => setDraft({ ...draft, p1: { ...draft.p1, hint: e.target.value } })} className="bg-white/[0.03] border-white/5 text-[10px] italic h-10" />
                </div>
              </div>
            </div>

            {/* Test Cases */}
            <div className="space-y-4 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/70">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-80">Validation_Test_Suite</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft({ ...draft, p1: { ...draft.p1, testCases: [...(draft.p1.testCases || []), { input: '', output: '' }] } })}
                  className="h-8 text-[9px] uppercase tracking-widest text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20"
                >
                  <Plus className="w-3 h-3 mr-2" /> Add Case
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-h-[240px] overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {(draft.p1.testCases || []).map((tc, idx) => (
                  <div key={idx} className="p-4 bg-white/[0.03] border border-white/5 relative group">
                    <button
                      onClick={() => {
                        const cases = draft.p1.testCases || [];
                        setDraft({ ...draft, p1: { ...draft.p1, testCases: cases.filter((_, i) => i !== idx) } });
                      }}
                      className="absolute top-2 right-2 text-white/30 hover:text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono uppercase text-white/40">Input</span>
                        <Input value={tc.input} onChange={e => {
                          const cases = [...(draft.p1.testCases || [])];
                          if (cases[idx]) {
                            cases[idx].input = e.target.value;
                            setDraft({ ...draft, p1: { ...draft.p1, testCases: cases } });
                          }
                        }} className="bg-transparent border-none p-0 h-6 text-[10px] font-mono focus-visible:ring-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono uppercase text-[var(--color-accent)]/60">Output</span>
                        <Input value={tc.output} onChange={e => {
                          const cases = [...(draft.p1.testCases || [])];
                          if (cases[idx]) {
                            cases[idx].output = e.target.value;
                            setDraft({ ...draft, p1: { ...draft.p1, testCases: cases } });
                          }
                        }} className="bg-transparent border-none p-0 h-6 text-[10px] font-mono text-[var(--color-accent)]/80 focus-visible:ring-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
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

        {/* Question List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <Terminal className="text-[var(--color-accent)] w-4 h-4" />
            <h3 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Active_Mission_Stack</h3>
          </div>

          <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {questions.map((q) => (
              <motion.div
                layout
                key={q.id}
                className="corner-card p-6 glass-morphism hover:border-[var(--color-accent)]/20 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl">
                      {q.round}
                    </div>
                    <div>
                      <div className="font-black uppercase tracking-widest text-sm">{q.p1.title}</div>
                      <div className="text-[8px] font-mono text-white/60 uppercase tracking-widest mb-1">Sequence_Round</div>
                      <div className="text-[8px] font-mono text-white/40 uppercase tracking-widest">{q.id.slice(-8).toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(q)} className="p-2 text-white/30 hover:text-white transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(q.id!)} className="p-2 text-white/10 hover:text-[var(--color-accent)] transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <div className="text-[8px] uppercase text-white/40 tracking-widest font-mono">Target_Node</div>
                    <div className="text-[10px] font-bold text-white/60 truncate">{q.coord.place}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[8px] uppercase text-white/40 tracking-widest font-mono">Secure_Passkey</div>
                    <div className="text-[10px] font-mono text-[var(--color-accent)]/80">{q.qrPasskey}</div>
                  </div>
                </div>
              </motion.div>
            ))}

            {!questions.length && (
              <div className="text-center py-20 border border-dashed border-white/10 glass-morphism">
                <Terminal className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <div className="text-[10px] uppercase tracking-[0.5em] text-white/20">Mission stack is empty</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
