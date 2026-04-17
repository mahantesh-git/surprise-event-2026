import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/**
 * Modal Component - Sutéra Design System
 * Blueprint card wrapper with overlay backdrop
 * Used for confirmation dialogs and important actions
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  className,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal Card */}
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none px-4"
      >
        <div
          className={cn(
            'corner-card relative bg-[#15171A] border-[#95FF00]/20 p-8 md:p-10 max-w-lg w-full pointer-events-auto',
            'animate-reveal-up',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative Corner Bracket */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-[#95FF00]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="mb-8 pr-10">
            <div className="flex items-center gap-3 text-[#95FF00] mb-2 opacity-50">
              <div className="w-1 h-3 bg-[#95FF00]" />
              <span className="text-[8px] uppercase tracking-[0.4em] font-mono">System_Message</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight uppercase leading-none text-white">
              {title.replace(' ', '_')}
            </h2>
            <div className="h-[1px] w-full bg-gradient-to-r from-[#95FF00]/30 to-transparent mt-4" />
          </div>

          {/* Content */}
          <div className="mb-10 text-[13px] leading-relaxed text-white/60 uppercase tracking-widest font-medium">
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex gap-4 justify-end pt-6 border-t border-white/5">
              {actions}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

Modal.displayName = 'Modal';
