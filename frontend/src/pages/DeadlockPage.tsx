import React, { useState } from 'react';
import { DeadlockResult, EnvironmentInfo } from '../types';
import { LabReportCard } from '../components/LabReportCard';
import { DeadlockGraph } from '../charts/DeadlockGraph';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { Play, Square, Lock, RotateCcw, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface DeadlockPageProps {
  onRun: (params: Record<string, any>) => void;
  onCancel: () => void;
  isRunning: boolean;
  result: DeadlockResult | null;
  environment: EnvironmentInfo | null;
  onSaveToHistory: (res: any, config: any) => void;
}

export const DeadlockPage: React.FC<DeadlockPageProps> = ({
  onRun,
  onCancel,
  isRunning,
  result,
  environment,
  onSaveToHistory,
}) => {
  const [mode, setMode] = useState('controlled_deadlock');
  const [resourceCount, setResourceCount] = useState(2);
  const [taskCount, setTaskCount] = useState(2);
  const [lockTimeoutMs, setLockTimeoutMs] = useState(1500);

  const handleStart = () => {
    onRun({
      mode,
      resource_count: resourceCount,
      task_count: taskCount,
      lock_timeout_ms: lockTimeoutMs,
      timeout_seconds: 20,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 06 • Resource Contention & Deadlock
          </span>
          <h2 className="text-lg font-bold text-heading">Deadlock Playground</h2>
        </div>
      </div>

      {/* Grid: Controls & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded p-4 space-y-4">
          <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2">
            Execution Mode & Thresholds
          </h3>

          <div>
            <label className="text-xs font-medium text-heading block mb-1">
              Deadlock Scenarios
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-xs font-mono text-heading"
            >
              <option value="controlled_deadlock">Controlled Deadlock (Opposite Lock Ordering)</option>
              <option value="safe_ordering">Safe Consistent Lock Ordering (Acyclic Prevention)</option>
              <option value="detection">Live Detection (RAG Cycle Monitor Thread)</option>
              <option value="recovery">Recovery & Backoff (Victim Releases & Retries)</option>
            </select>
          </div>

          <div className="font-mono text-xs space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-secondary block mb-1">Task Threads ({taskCount})</label>
              <input
                type="range"
                min={2}
                max={5}
                value={taskCount}
                onChange={(e) => setTaskCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-secondary block mb-1">Resources / Locks ({resourceCount})</label>
              <input
                type="range"
                min={2}
                max={5}
                value={resourceCount}
                onChange={(e) => setResourceCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-secondary block mb-1">
                Acquire Timeout ({lockTimeoutMs} ms)
              </label>
              <input
                type="range"
                min={500}
                max={4000}
                step={250}
                value={lockTimeoutMs}
                onChange={(e) => setLockTimeoutMs(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-secondary">
                Guarantees no thread hangs indefinitely.
              </span>
            </div>
          </div>

          <div className="pt-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Deadlock Scenario</span>
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="w-full py-2 px-4 bg-critical hover:bg-critical/90 text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancel / Reset Threads</span>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="space-y-4">
              <LabReportCard
                title={`Deadlock Observation: ${result.mode}`}
                verdict={result.cycle_detected ? 'FAILED' : 'CORRECT'}
                verdictLabel={
                  result.cycle_detected ? 'DEADLOCK CYCLE DETECTED' : 'SAFE / ACYCLIC EXECUTION'
                }
                configSummary={{
                  Mode: result.mode,
                  Tasks: taskCount,
                  Resources: resourceCount,
                  'Timeout (ms)': lockTimeoutMs,
                }}
                metrics={[
                  {
                    label: 'Cycle Detected',
                    value: result.cycle_detected ? 'YES' : 'NO',
                    unit: result.cycle_nodes.length ? `(${result.cycle_nodes.join('->')})` : '',
                  },
                  {
                    label: 'Completed Tasks',
                    value: result.tasks_completed,
                  },
                  {
                    label: 'Aborted / Timed-out',
                    value: result.tasks_aborted_or_timed_out,
                  },
                  {
                    label: 'Coffman Hold & Wait',
                    value: result.coffman.hold_and_wait ? 'YES' : 'BROKEN',
                  },
                ]}
                explanation={result.explanation}
                teachingPanel={{
                  whatToExpect:
                    'In controlled deadlock, opposing acquisition orders cause circular blocking until the bounded timeout trips. In safe ordering, all tasks acquire locks in identical sequential order, completely preventing circular wait.',
                  whatThisShows:
                    'Deadlock requires all four Coffman conditions simultaneously. Breaking lock acquisition order or releasing locks on timeout breaks the cycle.',
                  whatThisDoesNotProve:
                    'Timeouts alone do not cure architectural flaws: repeated retries without backoff can cause livelock.',
                }}
                onSave={() => onSaveToHistory(result, { mode, taskCount, resourceCount })}
              />

              {/* RAG & Coffman Panel */}
              <DeadlockGraph
                nodes={result.graph_nodes}
                edges={result.graph_edges}
                coffman={result.coffman}
                cycleDetected={result.cycle_detected}
                cycleNodes={result.cycle_nodes}
              />

              {result.traces && result.traces.length > 0 && (
                <ThreadTimeline traces={result.traces} runId="deadlock_live" />
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
              <Lock className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
              <div className="font-semibold text-heading text-sm">Awaiting Execution</div>
              <p className="max-w-md mx-auto">
                Configure lock ordering scenarios and click 'Simulate Deadlock Scenario' to inspect graph cycle detection and Coffman conditions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
