import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering crash:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-center space-y-4 max-w-lg mx-auto my-12 shadow-xl glass-card">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full animate-bounce">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-slate-100">
            UI Rendering Failed
          </h2>
          <p className="text-sm font-sans text-slate-500 dark:text-slate-400">
            An error occurred while compiling this visual module. This is typically due to third-party chart constraints or map canvas redraws.
          </p>
          <div className="bg-slate-900/5 dark:bg-slate-900/50 p-3 rounded-lg w-full text-left font-mono text-[11px] overflow-x-auto text-slate-600 dark:text-slate-400 max-h-36">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20"
          >
            <RotateCcw size={16} />
            Recover Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
