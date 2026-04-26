import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getChatPhrases, sendChatMessage, ChatMessage } from '@/lib/api';
import { TacticalStatus } from './TacticalStatus';

interface TacticalCommsProps {
  token: string;
  role: 'solver' | 'runner';
  isOpen: boolean;
  onClose: () => void;
  lastMessage?: ChatMessage | null;
  teamName: string;
  teamRunnerName?: string;
  teamSolverName?: string;
}

export function TacticalComms({ token, role, isOpen, onClose, lastMessage, teamName, teamRunnerName, teamSolverName }: TacticalCommsProps) {
  const [phrases, setPhrases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchPhrases = async () => {
        try {
          const res = await getChatPhrases(token);
          setPhrases(res.phrases);
        } catch (err) {
          console.error('Failed to fetch tactical phrases:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchPhrases();
    }
  }, [isOpen, token]);

  const handleSend = async (phrase: string) => {
    setSending(phrase);
    try {
      await sendChatMessage(token, phrase);
      onClose();
    } catch (err) {
      console.error('Failed to send tactical message:', err);
    } finally {
      setSending(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white/[0.04] glass-morphism backdrop-blur-sm z-[10002]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-4 right-4 bottom-4 md:left-auto md:right-8 md:bottom-8 md:w-[400px] z-[10003]"
          >
            <Card className="glass-morphism shadow-accent-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold tracking-tight uppercase text-[var(--color-accent)]">
                      Tactical Comms
                    </CardTitle>
                    <p className="text-[10px] text-[var(--color-accent)]/60 uppercase tracking-widest">
                      Encrypted Channel / {role.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 text-[var(--color-accent)]/50 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-6 h-6 border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] rounded-full animate-spin" />
                    <span className="text-[10px] text-[var(--color-accent)]/40 uppercase tracking-widest animate-pulse">
                      Establishing Link...
                    </span>
                  </div>
                )}

                {!loading && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-2">
                      {phrases.map((phrase) => (
                        <button
                          key={phrase}
                          onClick={() => handleSend(phrase)}
                          disabled={sending !== null}
                          className={cn(
                            "group relative flex items-center justify-between p-3 text-left transition-all duration-300",
                            "bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/10",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <span className="text-sm font-medium text-white group-hover:text-[var(--color-accent)] transition-colors">
                            {phrase}
                          </span>
                          {sending === phrase ? (
                            <div className="w-4 h-4 border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] rounded-full animate-spin" />
                          ) : (
                            <Send className="w-3 h-3 text-[var(--color-accent)]/30 group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                          )}

                          {/* Interactive scanline effect on hover */}
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--color-accent)]/20 animate-scan" />
                        </button>
                      ))}

                      {phrases.length === 0 && (
                        <div className="text-center py-8 opacity-40">
                          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[var(--color-accent)]/40" />
                          <p className="text-xs uppercase tracking-widest">No Tactical Phrases Configured</p>
                        </div>
                      )}
                    </div>

                    {/* Notification feed */}
                    {lastMessage && lastMessage.senderRole !== role && (
                      <div className="mt-8 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-[1px] flex-1 bg-[var(--color-accent)]/20" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]/60">Incoming Intel</span>
                          <div className="h-[1px] flex-1 bg-[var(--color-accent)]/20" />
                        </div>

                        <TacticalStatus
                          tone="success"
                          label={lastMessage.senderRole === 'runner' ? `${teamName.toUpperCase()}[${(teamRunnerName || 'RUNNER').toUpperCase()}]` : lastMessage.senderRole === 'solver' ? `${teamName.toUpperCase()}[${(teamSolverName || 'HQ').toUpperCase()}]` : 'COMMS [COMMAND]'}
                          message={lastMessage.text}
                          icon={CheckCircle2}
                          className="animate-in fade-in slide-in-from-left-4 duration-500"
                        />
                      </div>
                    )}

                    <div className="mt-6 flex items-center gap-3 px-1">
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-accent)]/20 to-transparent" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
                        <span className="text-[8px] text-[var(--color-accent)]/40 uppercase tracking-[0.2em]">Secure Session Active</span>
                      </div>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-accent)]/20 to-transparent" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
