import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = `Error: ${parsed.error}`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-void)]">
          <div className="corner-card bg-[var(--color-bg-surface)] backdrop-blur-xl p-8 max-w-md w-full border border-[var(--color-accent)]/20 text-center relative">
            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-[var(--color-accent)]/20 uppercase tracking-widest pointer-events-none">
              ERR_SYSTEM_FATAL
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-[var(--color-accent)]" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-white">System Breach</h1>
                <div className="flex items-center justify-center gap-2">
                  <div className="px-4 py-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] uppercase tracking-widest font-mono">
                    UNHANDLED_EXCEPTION
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em] leading-relaxed max-w-[280px]">
                The system has encountered an unhandled exception. Manual reboot required.
              </p>

              <Button
                onClick={() => window.location.reload()}
                className="w-full btn-primary h-14 uppercase tracking-widest font-black"
              >
                Reboot System
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
