import React from 'react';
import { EnvironmentInfo, JobSummary } from '../types';
import { Wifi, WifiOff, RefreshCw, Cpu, BookOpen, AlertCircle, Play } from 'lucide-react';

interface TopBarProps {
  pageTitle: string;
  isOnline: boolean;
  onRetryConnection: () => void;
  environment: EnvironmentInfo | null;
  activeJob: JobSummary | null;
  isGuidedDemo: boolean;
  onToggleGuidedDemo: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  pageTitle,
  isOnline,
  onRetryConnection,
  environment,
  activeJob,
  isGuidedDemo,
  onToggleGuidedDemo,
}) => {
  return (
    <header className="top-bar h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-40 select-none">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-panel text-heading border border-border rounded">
            TF-v2
          </span>
          <h1 className="text-base font-semibold text-heading truncate max-w-xs sm:max-w-md">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Guided Demo Mode Toggle */}
        <button
          onClick={onToggleGuidedDemo}
          className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium border rounded transition-colors ${
            isGuidedDemo
              ? 'bg-primary text-white border-primary'
              : 'bg-paper text-heading border-border hover:bg-panel'
          }`}
          title="Toggle 8-minute professor guided demo walkthrough"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Guided Demo</span>
        </button>

        {/* Real Environment Chip */}
        {environment && (
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 bg-paper border border-border rounded text-xs font-mono text-secondary">
            <Cpu className="w-3.5 h-3.5 text-heading" />
            <span title={`Platform: ${environment.platform}`}>
              Python {environment.python_version}
            </span>
            <span>•</span>
            <span>{environment.cpu_count} Cores</span>
            <span>•</span>
            <span
              className={`font-semibold ${
                environment.gil_enabled ? 'text-heading' : 'text-chart-olive'
              }`}
              title={environment.gil_enabled ? 'CPython Global Interpreter Lock enabled' : 'Free-threaded Python runtime'}
            >
              {environment.gil_enabled ? 'GIL' : 'NO-GIL'}
            </span>
          </div>
        )}

        {/* Active Job Indicator */}
        {activeJob && (
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-panel border border-border rounded text-xs">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="font-mono font-medium text-heading uppercase text-[10px]">
              {activeJob.status}: {Math.round(activeJob.progress_percent)}%
            </span>
          </div>
        )}

        {/* Connection Status Indicator */}
        {isOnline ? (
          <div className="flex items-center space-x-1 px-2 py-1 bg-[#14532D]/10 text-primary border border-primary/20 rounded text-xs font-mono">
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connected</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-critical/10 text-critical border border-critical/30 rounded text-xs">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold">Offline</span>
            <button
              onClick={onRetryConnection}
              className="p-0.5 hover:bg-critical/20 rounded"
              title="Retry backend connection. Start server using: cmd /c .venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
