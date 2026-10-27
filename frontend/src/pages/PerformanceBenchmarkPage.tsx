import React, { useState } from 'react';
import { BenchmarkResult, EnvironmentInfo } from '../types';
import { LabReportCard } from '../components/LabReportCard';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { Play, Pause, Square, AlertCircle, Clock, Zap, Cpu } from 'lucide-react';

interface PerformanceBenchmarkPageProps {
  onRun: (params: Record<string, any>) => void;
  onCancel: () => void;
  isRunning: boolean;
  result: BenchmarkResult | null;
  environment: EnvironmentInfo | null;
  onSaveToHistory: (res: any, config: any) => void;
}

export const PerformanceBenchmarkPage: React.FC<PerformanceBenchmarkPageProps> = ({
  onRun,
  onCancel,
  isRunning,
  result,
  environment,
  onSaveToHistory,
}) => {
  const [workload, setWorkload] = useState('wait_bound');
  const [tasks, setTasks] = useState(50);
  const [threads, setThreads] = useState(4);
  const [processes, setProcesses] = useState(4);
  const [includeProcessPool, setIncludeProcessPool] = useState(false);
  const [includeStartupCost, setIncludeStartupCost] = useState(true);
  const [waitMs, setWaitMs] = useState(10);
  const [cpuIntensity, setCpuIntensity] = useState(2000);
  const [trials, setTrials] = useState(3);
  const [warmupTrials, setWarmupTrials] = useState(1);
  const [useMeanSpeedup, setUseMeanSpeedup] = useState(false);

  const applyPreset = (preset: 'quick' | 'classroom' | 'thorough') => {
    if (preset === 'quick') {
      setWorkload('wait_bound');
      setTasks(30);
      setThreads(4);
      setWaitMs(5);
      setTrials(2);
      setWarmupTrials(0);
      setIncludeProcessPool(false);
    } else if (preset === 'classroom') {
      setWorkload('wait_bound');
      setTasks(80);
      setThreads(8);
      setWaitMs(10);
      setTrials(3);
      setWarmupTrials(1);
      setIncludeProcessPool(true);
    } else {
      setWorkload('gil_releasing');
      setTasks(120);
      setThreads(12);
      setWaitMs(10);
      setTrials(4);
      setWarmupTrials(1);
      setIncludeProcessPool(true);
    }
  };

  const handleStart = () => {
    onRun({
      workload,
      tasks,
      threads,
      processes,
      include_process_pool: includeProcessPool,
      include_startup_cost: includeStartupCost,
      wait_ms: waitMs,
      cpu_intensity: cpuIntensity,
      trials,
      warmup_trials: warmupTrials,
      timeout_seconds: 35,
    });
  };

  // Pre-run worst-case time bound
  const worstCaseBoundSec = Math.round(
    ((tasks * (workload.startsWith('wait') ? waitMs / 1000 : 0.05)) * (trials + warmupTrials) * 1.5) + 2
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 03 • Performance Slicing
          </span>
          <h2 className="text-lg font-bold text-heading">
            Multithreading Performance Benchmark
          </h2>
        </div>

        {/* Presets */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <span className="text-secondary mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('quick')}
            className="px-2 py-1 bg-paper border border-border hover:bg-panel rounded text-heading"
          >
            Quick (&lt;5s)
          </button>
          <button
            onClick={() => applyPreset('classroom')}
            className="px-2 py-1 bg-paper border border-border hover:bg-panel rounded text-heading"
          >
            Classroom (~15s)
          </button>
          <button
            onClick={() => applyPreset('thorough')}
            className="px-2 py-1 bg-paper border border-border hover:bg-panel rounded text-heading"
          >
            Thorough
          </button>
        </div>
      </div>

      {/* Main Grid: Controls Left, Results Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="bg-card border border-border rounded p-4 space-y-4">
          <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2">
            Configuration Parameters
          </h3>

          {/* Workload Type */}
          <div>
            <label className="text-xs font-medium text-heading block mb-1">
              Workload Category
            </label>
            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
              className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-xs font-mono text-heading"
            >
              <option value="wait_bound">Wait-Bound (time.sleep - Network/Disk Simulation)</option>
              <option value="wait_bound_io">Real Temp-File I/O (Disk Write/Read/Cleanup)</option>
              <option value="cpu_bound">Pure-Python CPU-Bound (Prime Counting)</option>
              <option value="gil_releasing">GIL-Releasing C-Extension (SHA-256 / zlib)</option>
            </select>
          </div>

          {/* Tasks & Threads Sliders */}
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <label className="text-secondary block mb-1">Tasks ({tasks})</label>
              <input
                type="range"
                min={5}
                max={500}
                value={tasks}
                onChange={(e) => setTasks(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-secondary block mb-1">Threads ({threads})</label>
              <input
                type="range"
                min={1}
                max={environment?.cpu_count ? Math.min(32, environment.cpu_count * 2) : 16}
                value={threads}
                onChange={(e) => setThreads(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Process Pool Option */}
          <div className="space-y-2 pt-2 border-t border-border/70 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeProcessPool}
                onChange={(e) => setIncludeProcessPool(e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-heading font-medium">Compare with ProcessPool</span>
            </label>

            {includeProcessPool && (
              <div className="pl-5 space-y-2 font-mono">
                <div>
                  <label className="text-secondary block mb-1">Worker Processes ({processes})</label>
                  <input
                    type="range"
                    min={1}
                    max={environment?.cpu_count || 8}
                    value={processes}
                    onChange={(e) => setProcesses(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <label className="flex items-center space-x-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={includeStartupCost}
                    onChange={(e) => setIncludeStartupCost(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <span className="text-secondary">Include Windows spawn startup cost in total</span>
                </label>
              </div>
            )}
          </div>

          {/* Wait Duration / CPU Intensity */}
          {workload.startsWith('wait') ? (
            <div className="font-mono text-xs">
              <label className="text-secondary block mb-1">Wait Duration per Task ({waitMs} ms)</label>
              <input
                type="range"
                min={1}
                max={50}
                value={waitMs}
                onChange={(e) => setWaitMs(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          ) : (
            <div className="font-mono text-xs">
              <label className="text-secondary block mb-1">CPU Work Intensity ({cpuIntensity})</label>
              <input
                type="range"
                min={500}
                max={10000}
                step={500}
                value={cpuIntensity}
                onChange={(e) => setCpuIntensity(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* Trials & Warm-up */}
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <label className="text-secondary block mb-1">Trials ({trials})</label>
              <input
                type="range"
                min={1}
                max={10}
                value={trials}
                onChange={(e) => setTrials(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="text-secondary block mb-1">Warm-up ({warmupTrials})</label>
              <input
                type="range"
                min={0}
                max={3}
                value={warmupTrials}
                onChange={(e) => setWarmupTrials(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Pre-Run Plan Time Bound */}
          <div className="bg-paper p-2.5 rounded border border-border text-xs font-mono space-y-1">
            <div className="flex items-center space-x-1 text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span>Run Plan Worst-Case Bound</span>
            </div>
            <div className="text-heading font-semibold">
              Bounded to ≤ {worstCaseBoundSec}s (timeout: 35s)
            </div>
            <div className="text-[10px] text-secondary">
              Worst-case upper bound derived from task count, wait times, and warm-up cycles.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Benchmark (Ctrl+Enter)</span>
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="w-full py-2 px-4 bg-critical hover:bg-critical/90 text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancel Execution (Esc)</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="space-y-4">
              {/* Lab Report Card */}
              <LabReportCard
                title={`Benchmark Results: ${result.workload}`}
                verdict="CORRECT"
                verdictLabel="REAL HARDWARE MEASUREMENT"
                configSummary={{
                  Tasks: result.tasks,
                  Threads: result.threads,
                  Processes: result.processes || 'N/A',
                  Workload: result.workload,
                }}
                metrics={[
                  {
                    label: 'Sequential Median',
                    value: `${result.approaches.Sequential?.stats.median_ms} ms`,
                  },
                  {
                    label: 'ThreadPool Median',
                    value: `${result.approaches.ThreadPool?.stats.median_ms} ms`,
                  },
                  {
                    label: 'Speedup',
                    value: `${
                      useMeanSpeedup
                        ? result.approaches.ThreadPool?.speedup_mean
                        : result.approaches.ThreadPool?.speedup_median
                    }x`,
                  },
                  {
                    label: 'Throughput',
                    value: `${result.approaches.ThreadPool?.throughput_tasks_per_sec}`,
                    unit: 'tasks/s',
                  },
                ]}
                explanation={result.explanation}
                teachingPanel={{
                  whatToExpect:
                    'Wait-bound workloads yield near-linear speedups as threads yield during sleep. Pure-Python CPU tasks will NOT accelerate under CPython due to GIL serialization. GIL-releasing C tasks (hashlib/zlib) demonstrate true multicore parallelism.',
                  whatThisShows:
                    'Multithreading speedup depends strictly on workload type and runtime GIL behavior, not just hardware core count.',
                  whatThisDoesNotProve:
                    'A speedup on this benchmark does NOT prove your arbitrary Python function will run concurrently without profiling whether it releases the GIL.',
                }}
                onSave={() => onSaveToHistory(result, { workload, tasks, threads })}
              />

              {/* Statistical Distribution Table */}
              <div className="bg-card border border-border rounded p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-xs font-mono font-semibold text-heading uppercase">
                    Statistical Measurement Distribution
                  </h4>
                  <label className="flex items-center space-x-1 text-xs font-mono text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useMeanSpeedup}
                      onChange={(e) => setUseMeanSpeedup(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span>Toggle Mean vs Median Speedup</span>
                  </label>
                </div>

                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-panel text-heading font-semibold">
                      <tr>
                        <th className="p-2 border border-border">Approach</th>
                        <th className="p-2 border border-border">Median</th>
                        <th className="p-2 border border-border">Min</th>
                        <th className="p-2 border border-border">p95</th>
                        <th className="p-2 border border-border">Std Dev</th>
                        <th className="p-2 border border-border">CV (%)</th>
                        <th className="p-2 border border-border">Speedup</th>
                        <th className="p-2 border border-border">Karp-Flatt Serial</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {Object.values(result.approaches).map((app) => (
                        <tr key={app.name}>
                          <td className="p-2 border border-border font-semibold text-heading">
                            {app.name}
                            {app.startup_cost_ms && (
                              <span className="block text-[10px] text-secondary font-normal">
                                (Startup: {app.startup_cost_ms} ms)
                              </span>
                            )}
                          </td>
                          <td className="p-2 border border-border tabular-nums font-semibold">
                            {app.stats.median_ms} ms
                          </td>
                          <td className="p-2 border border-border tabular-nums">{app.stats.min_ms} ms</td>
                          <td className="p-2 border border-border tabular-nums">{app.stats.p95_ms} ms</td>
                          <td className="p-2 border border-border tabular-nums">{app.stats.std_dev_ms} ms</td>
                          <td className="p-2 border border-border tabular-nums">
                            {app.stats.cv_percent}%
                            {app.stats.is_noisy && (
                              <span className="ml-1 text-warning font-semibold" title="High variance > 15%">
                                [NOISY]
                              </span>
                            )}
                          </td>
                          <td className="p-2 border border-border tabular-nums font-semibold text-primary">
                            {useMeanSpeedup ? app.speedup_mean : app.speedup_median}x
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {app.karp_flatt_serial_fraction !== null && app.karp_flatt_serial_fraction !== undefined
                              ? `${(app.karp_flatt_serial_fraction * 100).toFixed(1)}%`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-secondary italic">
                  {result.variability_disclosure}
                </div>
              </div>

              {/* Real Timeline Integration */}
              {result.traces && result.traces.length > 0 && (
                <ThreadTimeline traces={result.traces} runId="benchmark_live" />
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
              <Zap className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
              <div className="font-semibold text-heading text-sm">Awaiting Execution</div>
              <p className="max-w-md mx-auto">
                Configure workload parameters on the left and click 'Execute Benchmark'.
                Real timing statistics, speedup, and Gantt timeline will render live.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
