import React from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Info, Bookmark, RotateCcw,
  GitCompare, HelpCircle
} from 'lucide-react';

interface LabReportCardProps {
  title: string;
  verdict: 'CORRECT' | 'WARNING' | 'FAILED' | 'NEUTRAL';
  verdictLabel: string;
  configSummary: Record<string, any>;
  expectedVsActual?: { expected: any; actual: any; unit?: string };
  metrics: Array<{ label: string; value: string | number; unit?: string; mono?: boolean }>;
  explanation: string;
  teachingPanel: {
    whatToExpect: string;
    whatThisShows: string;
    whatThisDoesNotProve: string;
  };
  onSave?: () => void;
  onRerun?: () => void;
  onCompare?: () => void;
  isSaved?: boolean;
}

export const LabReportCard: React.FC<LabReportCardProps> = ({
  title,
  verdict,
  verdictLabel,
  configSummary,
  expectedVsActual,
  metrics,
  explanation,
  teachingPanel,
  onSave,
  onRerun,
  onCompare,
  isSaved,
}) => {
  const getVerdictBadge = () => {
    switch (verdict) {
      case 'CORRECT':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#14532D]/10 text-primary border border-primary/20 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{verdictLabel}</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-warning/15 text-warning border border-warning/30 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{verdictLabel}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-critical/15 text-critical border border-critical/30 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>{verdictLabel}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-panel text-heading border border-border text-xs font-semibold">
            <Info className="w-3.5 h-3.5" />
            <span>{verdictLabel}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-card border border-border rounded p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <span className="text-[10px] font-mono text-secondary uppercase tracking-wider">
            Verified Lab Report
          </span>
          <h3 className="text-base font-semibold text-heading">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {getVerdictBadge()}
          {onSave && (
            <button
              onClick={onSave}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium border rounded transition-colors ${
                isSaved
                  ? 'bg-panel text-heading border-border cursor-default'
                  : 'bg-card text-heading border-border hover:bg-panel'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          )}
          {onRerun && (
            <button
              onClick={onRerun}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-card text-heading border border-border hover:bg-panel rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rerun</span>
            </button>
          )}
          {onCompare && (
            <button
              onClick={onCompare}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-card text-heading border border-border hover:bg-panel rounded transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {Object.entries(configSummary).map(([key, val]) => (
          <div key={key} className="bg-paper p-2 rounded border border-border/70">
            <div className="text-[10px] font-mono uppercase text-secondary">{key}</div>
            <div className="font-mono font-medium text-heading mt-0.5">{String(val)}</div>
          </div>
        ))}
      </div>

      {/* Expected vs Actual if applicable */}
      {expectedVsActual && (
        <div className="bg-paper border border-border rounded p-3 text-xs flex flex-wrap items-center justify-between gap-4 font-mono">
          <div>
            <span className="text-secondary uppercase text-[10px] block">Expected Value</span>
            <span className="text-heading font-semibold text-sm">
              {expectedVsActual.expected} {expectedVsActual.unit}
            </span>
          </div>
          <div>
            <span className="text-secondary uppercase text-[10px] block">Actual Measured</span>
            <span
              className={`font-semibold text-sm ${
                expectedVsActual.expected === expectedVsActual.actual
                  ? 'text-primary'
                  : 'text-critical'
              }`}
            >
              {expectedVsActual.actual} {expectedVsActual.unit}
            </span>
          </div>
          <div>
            <span className="text-secondary uppercase text-[10px] block">Delta / Error</span>
            <span className="font-semibold text-sm text-heading">
              {Math.abs(expectedVsActual.expected - expectedVsActual.actual)}
            </span>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-card border border-border rounded p-2.5">
            <div className="text-[11px] text-secondary">{m.label}</div>
            <div
              className={`text-base font-semibold text-heading mt-1 ${
                m.mono !== false ? 'font-mono tabular-nums' : ''
              }`}
            >
              {m.value} {m.unit && <span className="text-xs font-normal text-secondary">{m.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Analytical Explanation */}
      <div className="bg-paper border-l-2 border-primary p-3 rounded-r text-xs leading-relaxed text-heading">
        <span className="font-semibold block mb-1">Explain this result:</span>
        {explanation}
      </div>

      {/* Three Teaching Headings Panel */}
      <div className="border border-border rounded overflow-hidden text-xs">
        <div className="bg-panel px-3 py-1.5 font-semibold text-heading border-b border-border flex items-center space-x-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-secondary" />
          <span>Engineering Concept & Boundaries</span>
        </div>
        <div className="p-3 space-y-3 bg-card">
          <div>
            <div className="font-semibold text-heading mb-0.5">1. What to expect:</div>
            <div className="text-secondary leading-relaxed">{teachingPanel.whatToExpect}</div>
          </div>
          <div>
            <div className="font-semibold text-heading mb-0.5">2. What this shows:</div>
            <div className="text-secondary leading-relaxed">{teachingPanel.whatThisShows}</div>
          </div>
          <div>
            <div className="font-semibold text-heading mb-0.5">3. What this does NOT prove:</div>
            <div className="text-secondary leading-relaxed">{teachingPanel.whatThisDoesNotProve}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
