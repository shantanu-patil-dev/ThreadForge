import React, { useState } from 'react';
import { SynchronizationResult, EnvironmentInfo } from '../types';
import { LabReportCard } from '../components/LabReportCard';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { Play, Square, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

interface SynchronizationPageProps {
  onRun: (params: Record<string, any>) => void;
  onCancel: () => void;
  isRunning: boolean;
  result: SynchronizationResult | null;
  environment: EnvironmentInfo | null;
  onSaveToHistory: (res: any, config: any) => void;
}

export const SynchronizationPage: React.FC<SynchronizationPageProps> = ({
  onRun,
  onCancel,
  isRunning,
  result,
  environment,
  onSaveToHistory,
}) => {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    'none',
    'mutex',
    'atomic',
    'thread_local',
    'lock_striping',
  ]);
  const [workers, setWorkers] = useState(4);
  const [increments, setIncrements] = useState(10000);
  const [stripes, setStripes] = useState(4);
  const [trials, setTrials] = useState(3);

  const toggleStrategy = (strat: string) => {
    setSelectedStrategies((prev) =>
      prev.includes(strat) ? prev.filter((s) => s !== strat) : [...prev, strat]
    );
  };

  const handleStart = () => {
    onRun({
      strategies: selectedStrategies,
      workers,
      increments_per_worker: increments,
      stripe_count: stripes,
      trials,
      timeout_seconds: 30,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 05 • Concurrency Protection
          </span>
          <h2 className="text-lg font-bold text-heading">
            Synchronization Primitive Comparison
          </h2>
        </div>
      </div>

      {/* Grid: Controls & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded p-4 space-y-4">
          <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2">
            Configuration & Primitives
          </h3>

          {/* Strategy Checkboxes */}
          <div>
            <label className="text-xs font-medium text-heading block mb-2">
              Primacy Evaluation Strategies
            </label>
            <div className="space-y-2 text-xs font-mono">
              {[
                { id: 'none', label: 'None (Unsafe Baseline)' },
                { id: 'mutex', label: 'threading.Lock (Exclusive Mutex)' },
                { id: 'atomic', label: 'itertools.count (CPython Atomic Opcode)' },
                { id: 'thread_local', label: 'Thread-Local Accumulation (No Contention)' },
                { id: 'lock_striping', label: 'Lock Striping (Partitioned Locks)' },
              ].map((item) => (
                <label key={item.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStrategies.includes(item.id)}
                    onChange={() => toggleStrategy(item.id)}
                    className="rounded accent-primary"
                  />
                  <span className="text-heading">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="font-mono text-xs space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-secondary block mb-1">Worker Threads ({workers})</label>
              <input
                type="range"
                min={2}
                max={16}
                value={workers}
                onChange={(e) => setWorkers(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-secondary block mb-1">
                Increments per Worker ({increments.toLocaleString()})
              </label>
              <input
                type="range"
                min={1000}
                max={50000}
                step={1000}
                value={increments}
                onChange={(e) => setIncrements(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-secondary block mb-1">Lock Stripes ({stripes})</label>
              <input
                type="range"
                min={2}
                max={16}
                value={stripes}
                onChange={(e) => setStripes(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-secondary block mb-1">Trials ({trials})</label>
              <input
                type="range"
                min={1}
                max={5}
                value={trials}
                onChange={(e) => setTrials(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={selectedStrategies.length === 0}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Benchmark Primitives (Ctrl+Enter)</span>
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="w-full py-2 px-4 bg-critical hover:bg-critical/90 text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancel (Esc)</span>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="space-y-4">
              <LabReportCard
                title="Synchronization Comparison"
                verdict="CORRECT"
                verdictLabel="CORRECTNESS EVALUATED"
                configSummary={{
                  Workers: result.workers,
                  'Increments/Worker': result.increments_per_worker,
                  Strategies: Object.keys(result.strategies).length,
                }}
                metrics={Object.values(result.strategies).map((s) => ({
                  label: s.method.toUpperCase(),
                  value: `${s.stats.median_ms} ms`,
                  unit: s.correctness ? 'CORRECT' : 'WRONG',
                }))}
                explanation={result.explanation}
                teachingPanel={{
                  whatToExpect:
                    'None will run fast but produce wrong counts. Thread-local accumulation runs fastest among correct strategies because threads never touch shared memory until final aggregation. Mutex incurs acquisition and thread wakeup costs.',
                  whatThisShows:
                    'Synchronization overhead is measured against the zero-contention thread-local baseline, not against the incorrect strategy.',
                  whatThisDoesNotProve:
                    'No synchronization method is universally superior: thread-local uses more memory, mutex offers simplicity, and atomics require hardware/runtime support.',
                }}
                onSave={() => onSaveToHistory(result, { workers, increments })}
              />

              {/* Comparative Table */}
              <div className="bg-card border border-border rounded p-4 space-y-3">
                <h4 className="text-xs font-mono font-semibold text-heading uppercase border-b border-border pb-2">
                  Strategy Performance & Correctness Table
                </h4>
                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-panel text-heading font-semibold">
                      <tr>
                        <th className="p-2 border border-border">Primitive</th>
                        <th className="p-2 border border-border">Correctness</th>
                        <th className="p-2 border border-border">Actual / Expected</th>
                        <th className="p-2 border border-border">Runtime (ms)</th>
                        <th className="p-2 border border-border">Overhead vs Thread-Local</th>
                        <th className="p-2 border border-border">Throughput (ops/s)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {Object.values(result.strategies).map((strat) => (
                        <tr key={strat.method}>
                          <td className="p-2 border border-border font-semibold text-heading">
                            {strat.method}
                            {strat.method === 'atomic' && (
                              <span className="block text-[10px] text-secondary font-normal">
                                (CPython detail)
                              </span>
                            )}
                          </td>
                          <td className="p-2 border border-border">
                            {strat.correctness ? (
                              <span className="inline-flex items-center space-x-1 text-primary font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>CORRECT</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-critical/15 text-critical font-bold text-[10px]">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>FAST BUT WRONG</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            <span className={strat.correctness ? 'text-heading' : 'text-critical font-bold'}>
                              {strat.actual.toLocaleString()}
                            </span>{' '}
                            / {strat.expected.toLocaleString()}
                          </td>
                          <td className="p-2 border border-border tabular-nums font-semibold">
                            {strat.stats.median_ms} ms
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {strat.overhead_vs_thread_local_ms !== null && strat.overhead_vs_thread_local_ms !== undefined
                              ? strat.overhead_vs_thread_local_ms > 0
                                ? `+${strat.overhead_vs_thread_local_ms} ms (${strat.overhead_percent}%)`
                                : `${strat.overhead_vs_thread_local_ms} ms (baseline)`
                              : '-'}
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {strat.throughput.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.traces && result.traces.length > 0 && (
                <ThreadTimeline traces={result.traces} runId="synchronization_live" />
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
              <ShieldCheck className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
              <div className="font-semibold text-heading text-sm">Awaiting Execution</div>
              <p className="max-w-md mx-auto">
                Select synchronization primitives and click 'Benchmark Primitives' to evaluate real overhead and correctness.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
