import React, { useState } from 'react';
import { ThreadPoolResult, EnvironmentInfo } from '../types';
import { LabReportCard } from '../components/LabReportCard';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { Play, Square, Layers, Clock, Cpu, Gauge } from 'lucide-react';

interface ThreadPoolPageProps {
  onRun: (params: Record<string, any>) => void;
  onCancel: () => void;
  isRunning: boolean;
  result: ThreadPoolResult | null;
  environment: EnvironmentInfo | null;
  onSaveToHistory: (res: any, config: any) => void;
}

export const ThreadPoolPage: React.FC<ThreadPoolPageProps> = ({
  onRun,
  onCancel,
  isRunning,
  result,
  environment,
  onSaveToHistory,
}) => {
  const [workload, setWorkload] = useState('wait_bound');
  const [tasks, setTasks] = useState(50);
  const [poolWorkers, setPoolWorkers] = useState(4);
  const [waitMs, setWaitMs] = useState(5);
  const [cpuIntensity, setCpuIntensity] = useState(1500);

  const handleStart = () => {
    onRun({
      workload,
      tasks,
      pool_workers: poolWorkers,
      wait_ms: waitMs,
      cpu_intensity: cpuIntensity,
      trials: 1,
      timeout_seconds: 30,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 07 • Resource Management
          </span>
          <h2 className="text-lg font-bold text-heading">Thread Pool Optimizer</h2>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded p-4 space-y-4">
          <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2">
            Pool & Workload Parameters
          </h3>

          <div>
            <label className="text-xs font-medium text-heading block mb-1">
              Task Workload Category
            </label>
            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
              className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-xs font-mono text-heading"
            >
              <option value="wait_bound">Wait-Bound (time.sleep - Network simulation)</option>
              <option value="tiny">Tiny Micro-Task (Exposing Creation Overhead)</option>
              <option value="cpu_bound">CPU-Bound (Prime Counting)</option>
              <option value="gil_releasing">GIL-Releasing C-Hash (SHA-256)</option>
            </select>
          </div>

          <div className="font-mono text-xs space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-secondary block mb-1">Total Tasks ({tasks})</label>
              <input
                type="range"
                min={10}
                max={300}
                value={tasks}
                onChange={(e) => setTasks(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="text-[10px] text-secondary">Thread-per-task limit: 2000</span>
            </div>

            <div>
              <label className="text-secondary block mb-1">
                Fixed Pool Workers ({poolWorkers})
              </label>
              <input
                type="range"
                min={2}
                max={environment?.cpu_count ? Math.min(32, environment.cpu_count * 2) : 16}
                value={poolWorkers}
                onChange={(e) => setPoolWorkers(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {workload === 'wait_bound' && (
              <div>
                <label className="text-secondary block mb-1">Wait Duration ({waitMs} ms)</label>
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={waitMs}
                  onChange={(e) => setWaitMs(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Evaluate Pool Overhead (Ctrl+Enter)</span>
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
                title={`Thread Pool Optimization: ${result.workload}`}
                verdict="CORRECT"
                verdictLabel="HARDWARE BENCHMARK COMPLETE"
                configSummary={{
                  Tasks: result.tasks,
                  'Pool Workers': result.pool_workers,
                  Workload: result.workload,
                }}
                metrics={[
                  {
                    label: 'Kernel Thread Creation Cost',
                    value: `${(result.thread_creation_microbenchmark_ns / 1000).toFixed(1)} µs`,
                    unit: 'per thread',
                  },
                  {
                    label: 'Sequential Total',
                    value: `${result.approaches.Sequential?.total_time_ms} ms`,
                  },
                  {
                    label: 'ThreadPerTask Total',
                    value: `${result.approaches.ThreadPerTask?.total_time_ms} ms`,
                  },
                  {
                    label: 'ThreadPool Total',
                    value: `${result.approaches.ThreadPool?.total_time_ms} ms`,
                  },
                ]}
                explanation={result.explanation}
                teachingPanel={{
                  whatToExpect:
                    'Spawning a new thread per task incurs kernel thread allocation and teardown costs (~15-50 µs each on Windows). Fixed thread pools reuse workers via a task queue, eliminating repeated creation overhead.',
                  whatThisShows:
                    'For large numbers of tiny tasks, thread allocation costs outweigh computation. Reusable pools amortize allocation overhead and cap peak memory usage.',
                  whatThisDoesNotProve:
                    'A thread pool does NOT guarantee faster runtimes if tasks are blocked on I/O indefinitely or if worker threads sit idle with empty queues.',
                }}
                onSave={() => onSaveToHistory(result, { workload, tasks, poolWorkers })}
              />

              {/* Comparative Table */}
              <div className="bg-card border border-border rounded p-4 space-y-3">
                <h4 className="text-xs font-mono font-semibold text-heading uppercase border-b border-border pb-2">
                  Approach Comparison & Queue Metrics
                </h4>
                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-panel text-heading font-semibold">
                      <tr>
                        <th className="p-2 border border-border">Approach</th>
                        <th className="p-2 border border-border">Total Time</th>
                        <th className="p-2 border border-border">Avg Queue Wait</th>
                        <th className="p-2 border border-border">Avg Task Run</th>
                        <th className="p-2 border border-border">Allocation Overhead</th>
                        <th className="p-2 border border-border">Worker Utilization</th>
                        <th className="p-2 border border-border">Throughput</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {Object.values(result.approaches).map((app) => (
                        <tr key={app.name}>
                          <td className="p-2 border border-border font-semibold text-heading">
                            {app.name}
                          </td>
                          <td className="p-2 border border-border tabular-nums font-semibold">
                            {app.total_time_ms} ms
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {app.avg_queue_wait_ms} ms
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {app.avg_task_run_ms} ms
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {app.thread_creation_overhead_ms !== null && app.thread_creation_overhead_ms !== undefined
                              ? `${app.thread_creation_overhead_ms} ms`
                              : '0.0 ms (reused)'}
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {app.worker_utilization_percent}%
                          </td>
                          <td className="p-2 border border-border tabular-nums text-primary font-semibold">
                            {app.throughput_tasks_per_sec.toLocaleString()} tasks/s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.traces && result.traces.length > 0 && (
                <ThreadTimeline traces={result.traces} runId="thread_pool_live" />
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
              <Layers className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
              <div className="font-semibold text-heading text-sm">Awaiting Execution</div>
              <p className="max-w-md mx-auto">
                Configure workload and click 'Evaluate Pool Overhead' to measure thread allocation latency and queue wait metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
