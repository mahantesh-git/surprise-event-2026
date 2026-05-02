import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal, ShieldAlert, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface AdminToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: { title: string; message: string; confirmText?: string; cancelText?: string }) => Promise<boolean>;
}

const AdminToastContext = createContext<AdminToastContextType | undefined>(undefined);

export const AdminToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    resolve: (val: boolean) => void;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const confirm = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' }: any) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ resolve, title, message, confirmText, cancelText });
    });
  }, []);

  const handleConfirm = (val: boolean) => {
    confirmState?.resolve(val);
    setConfirmState(null);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AdminToastContext.Provider value={{ showToast, confirm }}>
      {children}
      
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => handleConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md p-8 glass-morphism border border-white/10 corner-card"
            >
              <div className="flex items-center gap-3 mb-6 text-[var(--color-accent)]">
                <ShieldAlert size={24} />
                <h3 className="text-xl font-black uppercase tracking-widest">{confirmState.title}</h3>
              </div>
              <p className="text-white/60 mb-8 leading-relaxed">
                {confirmState.message}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleConfirm(false)}
                  className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-white/60 font-bold uppercase tracking-widest text-[10px] transition-colors rounded"
                >
                  {confirmState.cancelText}
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  className="flex-1 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-black font-bold uppercase tracking-widest text-[10px] transition-colors rounded"
                >
                  {confirmState.confirmText}
                </button>
              </div>
              
              {/* Tactical accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[var(--color-accent)]/40" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[var(--color-accent)]/40" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[var(--color-accent)]/40" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[var(--color-accent)]/40" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 100, opacity: 0, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AdminToastContext.Provider>
  );
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const config = {
    success: { icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    error: { icon: ShieldAlert, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
    info: { icon: Info, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  };

  const { icon: Icon, color, border, bg } = config[toast.type];

  return (
    <div className={`
      relative min-w-[320px] max-w-[420px] p-4 
      backdrop-blur-xl border ${border} ${bg}
      corner-card shadow-2xl flex items-start gap-4 group
    `}>
      <div className={`${color} pt-0.5`}>
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mb-1">
          System_Notification
        </div>
        <div className="text-sm text-white font-bold tracking-wide">
          {toast.message}
        </div>
      </div>
      <button 
        onClick={onClose}
        className="text-white/20 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
      
      {/* Tactical border accents */}
      <div className={`absolute top-0 right-0 w-8 h-[1px] ${color.replace('text', 'bg')}/40`} />
      <div className={`absolute bottom-0 left-0 w-8 h-[1px] ${color.replace('text', 'bg')}/40`} />
    </div>
  );
};

export const useAdminToast = () => {
  const context = useContext(AdminToastContext);
  if (!context) throw new Error('useAdminToast must be used within AdminToastProvider');
  return context;
};
