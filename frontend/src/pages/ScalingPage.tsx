import React, { useState } from 'react';
import { ScalingResult, EnvironmentInfo } from '../types';
import { LabReportCard } from '../components/LabReportCard';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { Play, Square, TrendingUp, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { CHART_PALETTE } from '../utils/colors';

interface ScalingPageProps {
  onRun: (params: Record<string, any>) => void;
  onCancel: () => void;
  isRunning: boolean;
  result: ScalingResult | null;
  environment: EnvironmentInfo | null;
  onSaveToHistory: (res: any, config: any) => void;
}

export const ScalingPage: React.FC<ScalingPageProps> = ({
  onRun,
  onCancel,
  isRunning,
  result,
  environment,
  onSaveToHistory,
}) => {
  const [workload, setWorkload] = useState('wait_bound');
  const [tasks, setTasks] = useState(40);
  const [waitMs, setWaitMs] = useState(5);
  const [cpuIntensity, setCpuIntensity] = useState(2500);
  const [testProcesses, setTestProcesses] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'speedup' | 'throughput' | 'duration' | 'efficiency'>('speedup');

  // Derive default worker list from hardware CPU count
  const cpuCount = environment?.cpu_count || 8;
  const defaultWorkers = [1, 2, 4, Math.min(8, cpuCount), cpuCount];

  const handleStart = () => {
    onRun({
      workload,
      tasks,
      worker_counts: defaultWorkers,
      test_processes: testProcesses,
      wait_ms: waitMs,
      cpu_intensity: cpuIntensity,
      trials: 2,
      timeout_seconds: 45,
    });
  };

  // Prepare chart data merging threads, processes, and Amdahl model
  const chartData = React.useMemo(() => {
    if (!result || !result.curves || result.curves.length === 0) return [];
    const threadCurve = result.curves.find((c) => c.type === 'threads');
    const procCurve = result.curves.find((c) => c.type === 'processes');
    const amdahlPoints = threadCurve?.amdahl_curve_points || [];

    const map: Record<number, any> = {};

    threadCurve?.points.forEach((pt) => {
      map[pt.workers] = {
        workers: pt.workers,
        threadSpeedup: pt.speedup,
        threadThroughput: pt.throughput_tasks_per_sec,
        threadDuration: pt.duration_ms,
        threadEfficiency: pt.efficiency,
        idealLinear: pt.workers,
      };
    });

    procCurve?.points.forEach((pt) => {
      if (!map[pt.workers]) map[pt.workers] = { workers: pt.workers, idealLinear: pt.workers };
      map[pt.workers].procSpeedup = pt.speedup;
      map[pt.workers].procThroughput = pt.throughput_tasks_per_sec;
      map[pt.workers].procDuration = pt.duration_ms;
      map[pt.workers].procEfficiency = pt.efficiency;
    });

    amdahlPoints.forEach((pt) => {
      if (!map[pt.workers]) map[pt.workers] = { workers: pt.workers, idealLinear: pt.workers };
      map[pt.workers].amdahlModel = pt.model_speedup;
    });

    return Object.values(map).sort((a: any, b: any) => a.workers - b.workers);
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 09 • Scaling & Limits
          </span>
          <h2 className="text-lg font-bold text-heading">Scaling Analyzer & Amdahl's Law</h2>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded p-4 space-y-4">
          <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2">
            Scaling Configuration
          </h3>

          <div>
            <label className="text-xs font-medium text-heading block mb-1">
              Workload Category
            </label>
            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
              className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-xs font-mono text-heading"
            >
              <option value="wait_bound">Wait-Bound (I/O Stand-in)</option>
              <option value="gil_releasing">GIL-Releasing C-Hash (True Multicore)</option>
              <option value="cpu_bound">Pure-Python CPU-Bound (Prime Counting)</option>
            </select>
          </div>

          <div className="font-mono text-xs space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-secondary block mb-1">Total Tasks ({tasks})</label>
              <input
                type="range"
                min={10}
                max={150}
                value={tasks}
                onChange={(e) => setTasks(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="bg-paper p-2.5 rounded border border-border">
              <span className="text-secondary text-[10px] uppercase block">Sweep Worker Counts</span>
              <span className="text-heading font-semibold mt-0.5 block">
                [{defaultWorkers.join(', ')}] workers
              </span>
              <span className="text-[10px] text-secondary mt-1 block">
                Derived directly from {cpuCount} hardware CPU cores.
              </span>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer text-xs pt-1">
              <input
                type="checkbox"
                checked={testProcesses}
                onChange={(e) => setTestProcesses(e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-heading font-medium">Include ProcessPool Scaling</span>
            </label>
          </div>

          <div className="pt-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Scaling Sweep (Ctrl+Enter)</span>
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="w-full py-2 px-4 bg-critical hover:bg-critical/90 text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancel Sweep (Esc)</span>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="space-y-4">
              <LabReportCard
                title={`Multicore Scaling Sweep: ${result.workload}`}
                verdict="CORRECT"
                verdictLabel="HARDWARE SCALING SWEEP COMPLETE"
                configSummary={{
                  Workload: result.workload,
                  Tasks: result.tasks,
                  'Max Workers': Math.max(...defaultWorkers),
                  'Fitted Serial Fraction': `${((result.curves[0]?.amdahl_fitted_serial_fraction || 0) * 100).toFixed(1)}%`,
                }}
                metrics={[
                  {
                    label: 'Fitted Amdahl Serial (s)',
                    value: `${((result.curves[0]?.amdahl_fitted_serial_fraction || 0) * 100).toFixed(1)}%`,
                    unit: 'empirical',
                  },
                  {
                    label: 'Max Speedup Achieved',
                    value: `${Math.max(...(result.curves[0]?.points.map((p) => p.speedup) || [1]))}x`,
                  },
                  {
                    label: 'Max Throughput',
                    value: `${Math.max(...(result.curves[0]?.points.map((p) => p.throughput_tasks_per_sec) || [0]))}`,
                    unit: 'tasks/s',
                  },
                  {
                    label: 'Efficiency @ Peak',
                    value: `${(result.curves[0]?.points[result.curves[0].points.length - 1]?.efficiency || 0) * 100}%`,
                  },
                ]}
                explanation={result.explanation}
                teachingPanel={{
                  whatToExpect:
                    "Speedup increases with worker count initially, then plateaus according to Amdahl's Law: Speedup = 1 / (s + (1-s)/p). Beyond the physical core count, thread scheduling and context switching overhead cause diminishing returns.",
                  whatThisShows:
                    'The empirical serial fraction (s) models the unparallelizable portion of execution. Even with infinite cores, maximum speedup is bounded by 1/s.',
                  whatThisDoesNotProve:
                    'Amdahl curve is a mathematical model fitted against empirical data points, not a physical law guarantee. Actual performance varies with cache thrashing and memory bandwidth saturation.',
                }}
                onSave={() => onSaveToHistory(result, { workload, tasks, defaultWorkers })}
              />

              {/* Scaling Metric Charts */}
              <div className="bg-card border border-border rounded p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <h4 className="text-xs font-mono font-semibold text-heading uppercase">
                    Interactive Scaling Curves
                  </h4>
                  {/* Metric Selectors */}
                  <div className="flex items-center space-x-1 font-mono text-xs">
                    {(['speedup', 'throughput', 'duration', 'efficiency'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setActiveMetric(m)}
                        className={`px-2 py-0.5 rounded capitalize ${
                          activeMetric === m
                            ? 'bg-panel font-bold text-heading border border-border'
                            : 'text-secondary hover:text-heading'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DED8CC" />
                      <XAxis
                        dataKey="workers"
                        stroke="#686B63"
                        fontSize={11}
                        fontFamily="IBM Plex Mono"
                        label={{ value: 'Worker Count (Threads/Procs)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#686B63' }}
                      />
                      <YAxis
                        stroke="#686B63"
                        fontSize={11}
                        fontFamily="IBM Plex Mono"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#DED8CC',
                          fontSize: '11px',
                          fontFamily: 'IBM Plex Mono',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'IBM Plex Mono' }} />

                      {activeMetric === 'speedup' && (
                        <>
                          <Line
                            type="monotone"
                            dataKey="threadSpeedup"
                            name="Threads Speedup (Measured)"
                            stroke={CHART_PALETTE[0]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="amdahlModel"
                            name="Amdahl's Law (Fitted Model)"
                            stroke={CHART_PALETTE[2]}
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="idealLinear"
                            name="Ideal Linear Reference (p)"
                            stroke="#686B63"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                            dot={false}
                          />
                          {testProcesses && (
                            <Line
                              type="monotone"
                              dataKey="procSpeedup"
                              name="Processes Speedup (Measured)"
                              stroke={CHART_PALETTE[3]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          )}
                        </>
                      )}

                      {activeMetric === 'throughput' && (
                        <Line
                          type="monotone"
                          dataKey="threadThroughput"
                          name="Throughput (tasks/s)"
                          stroke={CHART_PALETTE[0]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      )}

                      {activeMetric === 'duration' && (
                        <Line
                          type="monotone"
                          dataKey="threadDuration"
                          name="Runtime (ms)"
                          stroke={CHART_PALETTE[4]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      )}

                      {activeMetric === 'efficiency' && (
                        <Line
                          type="monotone"
                          dataKey="threadEfficiency"
                          name="Efficiency (Speedup / p)"
                          stroke={CHART_PALETTE[1]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-[11px] text-secondary font-mono flex items-center justify-between pt-1">
                  <span>Note: Amdahl curve is an empirical least-squares fit: model, not measurement.</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-card border border-border rounded p-4 space-y-3">
                <h4 className="text-xs font-mono font-semibold text-heading uppercase border-b border-border pb-2">
                  Measured Scaling Sweep Points
                </h4>
                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-panel text-heading font-semibold">
                      <tr>
                        <th className="p-2 border border-border">Workers</th>
                        <th className="p-2 border border-border">Duration</th>
                        <th className="p-2 border border-border">Throughput</th>
                        <th className="p-2 border border-border">Speedup</th>
                        <th className="p-2 border border-border">Efficiency</th>
                        <th className="p-2 border border-border">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {result.curves[0]?.points.map((pt) => (
                        <tr key={pt.workers}>
                          <td className="p-2 border border-border font-semibold text-heading">
                            {pt.workers} workers
                          </td>
                          <td className="p-2 border border-border tabular-nums font-semibold">
                            {pt.duration_ms} ms
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {pt.throughput_tasks_per_sec} tasks/s
                          </td>
                          <td className="p-2 border border-border tabular-nums text-primary font-semibold">
                            {pt.speedup}x
                          </td>
                          <td className="p-2 border border-border tabular-nums">
                            {(pt.efficiency * 100).toFixed(0)}%
                          </td>
                          <td className="p-2 border border-border">
                            {pt.error ? (
                              <span className="text-critical font-bold">ERROR</span>
                            ) : (
                              <span className="text-primary font-bold">PASS</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.traces && result.traces.length > 0 && (
                <ThreadTimeline traces={result.traces} runId="scaling_live" />
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
              <TrendingUp className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
              <div className="font-semibold text-heading text-sm">Awaiting Execution</div>
              <p className="max-w-md mx-auto">
                Click 'Run Scaling Sweep' to benchmark performance across multiple core configurations and fit Amdahl's Law.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
