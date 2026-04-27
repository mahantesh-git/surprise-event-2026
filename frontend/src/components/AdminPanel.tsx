import { useState, useEffect, useMemo } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import {
  Lock,
  Database,
  Trophy,
  Users,
  Terminal,
  Settings,
  ChevronLeft,
  LogOut,
  ShieldAlert,
  AlertCircle,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  adminLogin,
  getAdminTeams,
  getAdminQuestions,
  getAdminConfig,
  isAuthError,
  type RoundQuestion
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Sub-components
import { TeamManagement } from '@/components/admin/TeamManagement';
import { QuestionManagement } from '@/components/admin/QuestionManagement';
import { ConfigManagement } from '@/components/admin/ConfigManagement';
import { LeaderboardView } from '@/components/admin/LeaderboardView';
import { CommsManagement } from '@/components/admin/CommsManagement';
import { TacticalStatus } from '@/components/TacticalStatus';
import { TransitionPreview } from '@/components/TransitionPreview';

const ADMIN_SESSION_KEY = 'quest-admin-session';

type AdminPage = 'teams' | 'questions' | 'leaderboard' | 'config' | 'comms' | 'lab';

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem(ADMIN_SESSION_KEY));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  const [activePage, setActivePage] = useState<AdminPage>('leaderboard');
  const [loading, setLoading] = useState(false);

  // Data states shared across pages
  const [teams, setTeams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<RoundQuestion[]>([]);
  const [config, setConfig] = useState<any>(null);

  const refreshData = async (sessionToken: string) => {
    try {
      const [teamsResponse, questionsResponse, configResponse] = await Promise.all([
        getAdminTeams(sessionToken),
        getAdminQuestions(sessionToken),
        getAdminConfig(sessionToken),
      ]);

      setTeams(teamsResponse?.teams || []);
      const qArr = questionsResponse?.questions || (Array.isArray(questionsResponse) ? questionsResponse : []);
      setQuestions([...qArr].sort((a, b) => (a.round || 0) - (b.round || 0)));
      setConfig(configResponse);
      setError(null);
    } catch (refreshError) {
      if (isAuthError(refreshError)) {
        handleAdminLogout();
        setError('Admin session expired. Please sign in again.');
        return;
      }
      setError('Failed to refresh data from server');
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshData(token).finally(() => setLoading(false));
  }, [token]);

  const handleAdminLogin = async () => {
    if (isAdminLoggingIn) return;
    setError(null);
    setIsAdminLoggingIn(true);
    try {
      const response = await adminLogin(email, password);
      window.localStorage.setItem(ADMIN_SESSION_KEY, response.token);
      setToken(response.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const { connect: socketConnect, disconnect: socketDisconnect } = useSocket();

  // Connect socket when admin token is available; disconnect on logout
  useEffect(() => {
    if (token) {
      socketConnect(token);
    } else {
      socketDisconnect();
    }
  }, [token]);

  const handleAdminLogout = () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setToken(null);
    setError(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-[40vw] font-black leading-none">00</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md z-10">
          <div className="corner-card glass-morphism p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-2 relative group">
                <div className="absolute -inset-2 bg-[var(--color-accent)]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock className="text-[var(--color-accent)] w-8 h-8 relative z-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-[var(--color-accent)] tracking-[0.3em] font-black uppercase text-2xl">Admin_Auth</h1>
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-[1px] w-8 bg-[var(--color-accent)]/30" />
                  <span className="uppercase tracking-[0.4em] text-[8px] text-white/80">Secured_Access_Node</span>
                  <div className="h-[1px] w-8 bg-[var(--color-accent)]/30" />
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAdminLoggingIn}
                  className="bg-black/50 border-white/10 text-[10px] uppercase tracking-widest h-12"
                />
                <Input
                  placeholder="Security Key"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isAdminLoggingIn && handleAdminLogin()}
                  disabled={isAdminLoggingIn}
                  className="bg-black/50 border-white/10 text-[10px] uppercase tracking-widest h-12"
                />
              </div>
              {error && (
                <div className="flex justify-center">
                  <TacticalStatus
                    tone="error"
                    label="Authentication Error"
                    message={error}
                    icon={AlertCircle}
                  />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button className="btn-secondary flex-1 font-bold uppercase tracking-[0.2em] h-12" onClick={onBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Terminal
                </Button>
                <Button
                  className="btn-primary flex-1 font-bold uppercase tracking-[0.2em] h-12"
                  onClick={handleAdminLogin}
                  disabled={isAdminLoggingIn || !email.trim() || !password.trim()}
                >
                  {isAdminLoggingIn ? 'Authenticating...' : 'Authenticate'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'leaderboard', label: 'Live HUD', icon: Trophy },
    { id: 'teams', label: 'Operatives', icon: Users },
    { id: 'questions', label: 'Sequences', icon: Terminal },
    { id: 'comms', label: 'Comms', icon: MessageSquare },
    { id: 'lab', label: 'Visuals', icon: Sparkles },
    { id: 'config', label: 'Systems', icon: Settings },
  ] as const;

  return (
    <div className="fixed inset-0 text-white flex flex-col md:flex-row overflow-hidden z-10 bg-black">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 h-auto md:h-full border-b md:border-b-0 md:border-r border-white/5 glass-morphism flex flex-col z-20 flex-shrink-0">
        <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between md:block">
          <div>
            <div className="flex items-center gap-2 md:gap-3 text-[var(--color-accent)] mb-1 md:mb-2">
              <Database className="w-4 h-4" />
              <span className="hidden md:inline text-[10px] font-mono tracking-[0.3em] uppercase opacity-100">Admin_Panel</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none">
              Control<span className="text-[var(--color-accent)]">_</span>Center
            </h2>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="ghost" className="h-8 w-8 p-0 text-white/80 hover:text-white" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--color-accent)]/60 hover:text-[var(--color-accent)]" onClick={handleAdminLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex md:flex-col md:flex-1 p-2 md:p-4 gap-1 md:gap-2 overflow-x-auto md:overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={cn("flex-shrink-0 flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2.5 md:py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative group",
                  active
                    ?"bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-b-2 md:border-b-0 md:border-l-2 border-[var(--color-accent)]"
                    :"text-white/80 hover:text-white/90 hover:bg-white/[0.04]"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", active ?"text-[var(--color-accent)]" :"text-white/60 group-hover:text-white/80")} />
                <span className="whitespace-nowrap">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent pointer-events-none hidden md:block"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:block p-4 pb-8 border-t border-white/5 space-y-2 glass-morphism flex-shrink-0">
          <Button variant="ghost" className="w-full justify-start text-[9px] uppercase tracking-widest text-white/80 hover:text-white hover:bg-white/5" onClick={onBack}>
            <ChevronLeft className="mr-2 h-3 w-3" />
            Exit Terminal
          </Button>
          <Button variant="ghost" className="w-full justify-start text-[9px] uppercase tracking-widest text-[var(--color-accent)]/60 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5" onClick={handleAdminLogout}>
            <LogOut className="mr-2 h-3 w-3" />
            Disconnect
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="fixed top-0 right-0 p-12 opacity-[0.02] pointer-events-none select-none">
          <span className="text-[15vw] font-black leading-none uppercase">{activePage}</span>
        </div>

        <header className="min-h-[3.5rem] md:min-h-[5rem] border-b border-white/5 px-4 md:px-8 py-2 md:py-4 flex flex-wrap items-center justify-between gap-4 glass-morphism z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-1 w-8 bg-[var(--color-accent)]/50" />
            <h3 className="text-xs font-mono uppercase tracking-[0.5em] text-white/90">
              {navItems.find(i => i.id === activePage)?.label}_Protocol
            </h3>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <TacticalStatus
                tone="error"
                label="System Alert"
                message={error}
                icon={ShieldAlert}
              />
            </motion.div>
          )}
        </header>

        <div className={cn("flex-1 relative",
          activePage === 'leaderboard' ?"overflow-hidden" :"overflow-y-auto custom-scrollbar p-4 md:p-8"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn("relative", activePage === 'leaderboard' ?"h-full" :"min-h-full")}
            >
              {activePage === 'leaderboard' && <LeaderboardView />}
              {activePage === 'lab' && <TransitionPreview />}
              {activePage === 'teams' && (
                <TeamManagement
                  token={token}
                  teams={teams}
                  onRefresh={() => refreshData(token!)}
                  onError={setError}
                />
              )}
              {activePage === 'questions' && (
                <QuestionManagement
                  token={token}
                  questions={questions}
                  onRefresh={() => refreshData(token!)}
                  onError={setError}
                />
              )}
              {activePage === 'config' && (
                <ConfigManagement
                  token={token}
                  config={config}
                  onRefresh={() => refreshData(token!)}
                  onError={setError}
                />
              )}
              {activePage === 'comms' && (
                <CommsManagement
                  token={token}
                  teams={teams}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
