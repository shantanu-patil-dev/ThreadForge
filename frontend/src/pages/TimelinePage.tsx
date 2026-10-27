import React, { useState } from 'react';
import { SavedExperimentRun, TraceEvent } from '../types';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { GitGraph, Clock, Layers } from 'lucide-react';

interface TimelinePageProps {
  history: SavedExperimentRun[];
  activeTraces?: TraceEvent[];
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  history,
  activeTraces = [],
}) => {
  const [selectedRunId, setSelectedRunId] = useState<string>('live');

  // Filter runs that contain traces
  const runsWithTraces = history.filter((r) => r.result?.traces && r.result.traces.length > 0);

  const currentTraces =
    selectedRunId === 'live'
      ? activeTraces
      : runsWithTraces.find((r) => r.id === selectedRunId)?.result?.traces || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Analysis 08 • Execution Telemetry
          </span>
          <h2 className="text-lg font-bold text-heading">Thread Timeline Gantt Inspector</h2>
        </div>

        {/* Trace Selector */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-secondary">Trace Source:</span>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="bg-paper border border-border rounded px-2.5 py-1 text-heading text-xs"
          >
            <option value="live">Live Buffer ({activeTraces.length} events)</option>
            {runsWithTraces.map((r) => (
              <option key={r.id} value={r.id}>
                {r.experiment_type.toUpperCase()} - {new Date(r.timestamp).toLocaleTimeString()} ({r.result.traces.length} events)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Component */}
      <ThreadTimeline
        traces={currentTraces}
        runId={selectedRunId === 'live' ? 'live_buffer' : selectedRunId}
      />
    </div>
  );
};
