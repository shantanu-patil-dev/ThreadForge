import React, { useState } from 'react';
import { RaceConditionResult, EnvironmentInfo } from '../types';
import { LabReportCard } from '../components/LabReportCard';
import { ThreadTimeline } from '../charts/ThreadTimeline';
import { Play, Square, AlertTriangle, ShieldCheck, HelpCircle, StepForward, RotateCcw } from 'lucide-react';

interface RaceConditionPageProps {
  onRun: (params: Record<string, any>) => void;
  onCancel: () => void;
  isRunning: boolean;
  result: RaceConditionResult | null;
  environment: EnvironmentInfo | null;
  onSaveToHistory: (res: any, config: any) => void;
}

export const RaceConditionPage: React.FC<RaceConditionPageProps> = ({
  onRun,
  onCancel,
  isRunning,
  result,
  environment,
  onSaveToHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'real' | 'simulation'>('real');

  // Real controls
  const [workers, setWorkers] = useState(4);
  const [increments, setIncrements] = useState(5000);
  const [syncMethod, setSyncMethod] = useState('none');
  const [raceWindow, setRaceWindow] = useState('amplified');
  const [switchInterval, setSwitchInterval] = useState(0.0001);
  const [trials, setTrials] = useState(3);

  // Simulation interactive state
  const [simStepA, setSimStepA] = useState(0); // 0: init, 1: read, 2: add, 3: written
  const [simStepB, setSimStepB] = useState(0);
  const [localA, setLocalA] = useState(0);
  const [localB, setLocalB] = useState(0);
  const [sharedMemory, setSharedMemory] = useState(0);
  const [simHistory, setSimHistory] = useState<string[]>([]);

  const handleStart = () => {
    onRun({
      workers,
      increments_per_worker: increments,
      sync_method: syncMethod,
      race_window: raceWindow,
      switch_interval: switchInterval,
      trials,
      timeout_seconds: 30,
    });
  };

  // Advance simulation thread
  const stepThreadA = () => {
    if (simStepA >= 3) return;
    const nextStep = simStepA + 1;
    setSimStepA(nextStep);
    if (nextStep === 1) {
      setLocalA(sharedMemory);
      setSimHistory((h) => [...h, `Thread A: READ shared value (${sharedMemory}) into local register.`]);
    } else if (nextStep === 2) {
      setLocalA((l) => l + 1);
      setSimHistory((h) => [...h, `Thread A: ADD 1 to local register (${localA + 1}).`]);
    } else if (nextStep === 3) {
      setSharedMemory(localA);
      setSimHistory((h) => [...h, `Thread A: WRITE ${localA} to shared memory.`]);
    }
  };

  const stepThreadB = () => {
    if (simStepB >= 3) return;
    const nextStep = simStepB + 1;
    setSimStepB(nextStep);
    if (nextStep === 1) {
      setLocalB(sharedMemory);
      setSimHistory((h) => [...h, `Thread B: READ shared value (${sharedMemory}) into local register.`]);
    } else if (nextStep === 2) {
      setLocalB((l) => l + 1);
      setSimHistory((h) => [...h, `Thread B: ADD 1 to local register (${localB + 1}).`]);
    } else if (nextStep === 3) {
      setSharedMemory(localB);
      setSimHistory((h) => [...h, `Thread B: WRITE ${localB} to shared memory.`]);
    }
  };

  const resetSim = () => {
    setSimStepA(0);
    setSimStepB(0);
    setLocalA(0);
    setLocalB(0);
    setSharedMemory(0);
    setSimHistory([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 04 • Concurrency Hazards
          </span>
          <h2 className="text-lg font-bold text-heading">Race Condition Laboratory</h2>
        </div>

        {/* Tab Toggle: REAL vs SIMULATION */}
        <div className="flex items-center space-x-1 border border-border rounded p-0.5 bg-paper font-mono text-xs">
          <button
            onClick={() => setActiveTab('real')}
            className={`px-3 py-1 rounded transition-colors font-medium ${
              activeTab === 'real'
                ? 'bg-primary text-white shadow-xs'
                : 'text-heading hover:bg-panel'
            }`}
          >
            REAL (Measured)
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1 rounded transition-colors font-medium ${
              activeTab === 'simulation'
                ? 'bg-warning text-white shadow-xs'
                : 'text-heading hover:bg-panel'
            }`}
          >
            SIMULATION (Model)
          </button>
        </div>
      </div>

      {activeTab === 'real' ? (
        /* REAL TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-card border border-border rounded p-4 space-y-4">
            <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2">
              REAL Hardware Parameters
            </h3>

            <div>
              <label className="text-xs font-medium text-heading block mb-1">
                Protection Primitive
              </label>
              <select
                value={syncMethod}
                onChange={(e) => setSyncMethod(e.target.value)}
                className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-xs font-mono text-heading"
              >
                <option value="none">None (Unsafe Shared Mutation)</option>
                <option value="mutex">threading.Lock (Mutual Exclusion)</option>
                <option value="atomic">itertools.count (CPython Atomic Opcode)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-heading block mb-1">
                Race Window Exposure
              </label>
              <select
                value={raceWindow}
                onChange={(e) => setRaceWindow(e.target.value)}
                className="w-full bg-paper border border-border rounded px-2.5 py-1.5 text-xs font-mono text-heading"
              >
                <option value="amplified">Amplified for teaching (yield between read & write)</option>
                <option value="natural">Natural (plain counter += 1 under CPython GIL)</option>
              </select>
            </div>

            <div className="font-mono text-xs space-y-3">
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
                  min={500}
                  max={20000}
                  step={500}
                  value={increments}
                  onChange={(e) => setIncrements(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="text-secondary block mb-1">
                  Thread Switch Interval ({switchInterval}s)
                </label>
                <input
                  type="range"
                  min={0.00001}
                  max={0.005}
                  step={0.0001}
                  value={switchInterval}
                  onChange={(e) => setSwitchInterval(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="text-secondary block mb-1">Multi-Trial Runs ({trials})</label>
                <input
                  type="range"
                  min={1}
                  max={10}
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
                  className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Real Trials (Ctrl+Enter)</span>
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
                  title={`Race Condition Analysis: ${result.sync_method.toUpperCase()}`}
                  verdict={
                    result.verdict === 'CORRECT'
                      ? 'CORRECT'
                      : result.verdict === 'RACE_CONDITION_DETECTED'
                      ? 'FAILED'
                      : 'WARNING'
                  }
                  verdictLabel={
                    result.verdict === 'CORRECT'
                      ? 'NO RACE: ALL TRIALS CORRECT'
                      : result.verdict === 'RACE_CONDITION_DETECTED'
                      ? 'RACE CONDITION CONFIRMED: LOST UPDATES'
                      : 'NO RACE OBSERVED (NOT PROOF OF SAFETY)'
                  }
                  configSummary={{
                    Workers: result.workers,
                    'Increments/Worker': result.increments_per_worker,
                    'Sync Method': result.sync_method,
                    Window: result.race_window,
                  }}
                  expectedVsActual={{
                    expected: result.expected_total,
                    actual: result.trials[0]?.actual || 0,
                  }}
                  metrics={[
                    {
                      label: 'Failed Trials',
                      value: `${result.failed_trials_count} / ${result.total_trials_count}`,
                    },
                    {
                      label: 'Max Lost Updates',
                      value: Math.max(...result.trials.map((t) => t.lost_updates)),
                    },
                    {
                      label: 'Max Lost %',
                      value: `${Math.max(...result.trials.map((t) => t.lost_percentage))}%`,
                    },
                    {
                      label: 'Avg Duration',
                      value: `${result.average_duration_ms} ms`,
                    },
                  ]}
                  explanation={result.explanation}
                  teachingPanel={{
                    whatToExpect:
                      'Unsafe counters under amplified windows will lose updates predictably. Protected counters (Lock, Atomic) will remain exactly at total expected count across all trials.',
                    whatThisShows:
                      'How non-atomic read-modify-write sequences fail under thread preemption, and how locks serialize access to protect state.',
                    whatThisDoesNotProve:
                      'Observing zero lost updates under natural GIL conditions does NOT prove thread safety—it merely means preemption did not occur mid-bytecode on this trial.',
                  }}
                  onSave={() => onSaveToHistory(result, { workers, increments, syncMethod })}
                />

                {/* Multi-Trial Breakdown */}
                <div className="bg-card border border-border rounded p-4 space-y-3">
                  <h4 className="text-xs font-mono font-semibold text-heading uppercase border-b border-border pb-2">
                    Multi-Trial Execution Distribution ({result.trials.length} Trials)
                  </h4>
                  <div className="overflow-x-auto text-xs font-mono">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-panel text-heading font-semibold">
                        <tr>
                          <th className="p-2 border border-border">Trial</th>
                          <th className="p-2 border border-border">Expected</th>
                          <th className="p-2 border border-border">Actual Measured</th>
                          <th className="p-2 border border-border">Lost Updates</th>
                          <th className="p-2 border border-border">Loss %</th>
                          <th className="p-2 border border-border">Duration</th>
                          <th className="p-2 border border-border">Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {result.trials.map((t) => (
                          <tr key={t.trial_index}>
                            <td className="p-2 border border-border font-semibold">#{t.trial_index}</td>
                            <td className="p-2 border border-border tabular-nums">{t.expected}</td>
                            <td
                              className={`p-2 border border-border tabular-nums font-semibold ${
                                t.is_correct ? 'text-primary' : 'text-critical'
                              }`}
                            >
                              {t.actual}
                            </td>
                            <td className="p-2 border border-border tabular-nums font-semibold">
                              {t.lost_updates}
                            </td>
                            <td className="p-2 border border-border tabular-nums">{t.lost_percentage}%</td>
                            <td className="p-2 border border-border tabular-nums">{t.duration_ms} ms</td>
                            <td className="p-2 border border-border font-semibold">
                              {t.is_correct ? (
                                <span className="text-primary">PASS</span>
                              ) : (
                                <span className="text-critical">RACE</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {result.traces && result.traces.length > 0 && (
                  <ThreadTimeline traces={result.traces} runId="race_condition_live" />
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
                <AlertTriangle className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
                <div className="font-semibold text-heading text-sm">Awaiting Execution</div>
                <p className="max-w-md mx-auto">
                  Click 'Run Real Trials' to measure shared memory race conditions directly on hardware.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SIMULATION TAB */
        <div className="bg-card border border-warning/50 rounded p-5 space-y-6">
          <div className="bg-warning/10 border border-warning/30 rounded p-3 text-xs font-mono text-heading flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-warning">
              [SIMULATION MODE] Deterministic Teaching Model
            </span>
            <span className="text-secondary">Simulates register & memory steps</span>
          </div>

          {/* Interactive Stepping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thread A */}
            <div className="border border-border rounded p-4 bg-paper space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-sm font-bold text-heading font-mono">Thread A</h4>
                <span className="text-xs font-mono text-secondary">Step {simStepA}/3</span>
              </div>
              <div className="font-mono text-xs space-y-1.5">
                <div className={`p-2 rounded ${simStepA >= 1 ? 'bg-panel font-semibold' : 'text-secondary'}`}>
                  1. READ shared memory into register A
                </div>
                <div className={`p-2 rounded ${simStepA >= 2 ? 'bg-panel font-semibold' : 'text-secondary'}`}>
                  2. ADD 1 to register A (Local: {localA})
                </div>
                <div className={`p-2 rounded ${simStepA >= 3 ? 'bg-panel font-semibold' : 'text-secondary'}`}>
                  3. WRITE register A ({localA}) to shared memory
                </div>
              </div>
              <button
                onClick={stepThreadA}
                disabled={simStepA >= 3}
                className="w-full py-1.5 px-3 bg-heading hover:bg-black text-white text-xs font-semibold rounded disabled:opacity-40 flex items-center justify-center space-x-1"
              >
                <StepForward className="w-3.5 h-3.5" />
                <span>Advance Thread A (Step {simStepA + 1})</span>
              </button>
            </div>

            {/* Thread B */}
            <div className="border border-border rounded p-4 bg-paper space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-sm font-bold text-heading font-mono">Thread B</h4>
                <span className="text-xs font-mono text-secondary">Step {simStepB}/3</span>
              </div>
              <div className="font-mono text-xs space-y-1.5">
                <div className={`p-2 rounded ${simStepB >= 1 ? 'bg-panel font-semibold' : 'text-secondary'}`}>
                  1. READ shared memory into register B
                </div>
                <div className={`p-2 rounded ${simStepB >= 2 ? 'bg-panel font-semibold' : 'text-secondary'}`}>
                  2. ADD 1 to register B (Local: {localB})
                </div>
                <div className={`p-2 rounded ${simStepB >= 3 ? 'bg-panel font-semibold' : 'text-secondary'}`}>
                  3. WRITE register B ({localB}) to shared memory
                </div>
              </div>
              <button
                onClick={stepThreadB}
                disabled={simStepB >= 3}
                className="w-full py-1.5 px-3 bg-heading hover:bg-black text-white text-xs font-semibold rounded disabled:opacity-40 flex items-center justify-center space-x-1"
              >
                <StepForward className="w-3.5 h-3.5" />
                <span>Advance Thread B (Step {simStepB + 1})</span>
              </button>
            </div>
          </div>

          {/* Shared Memory State */}
          <div className="bg-paper border border-border rounded p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="text-secondary text-[10px] uppercase block">Shared Counter in RAM</span>
              <span className="text-2xl font-bold text-heading">{sharedMemory}</span>
            </div>
            <div>
              <span className="text-secondary text-[10px] uppercase block">Expected Value</span>
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <div>
              <span className="text-secondary text-[10px] uppercase block">Result Verdict</span>
              {simStepA === 3 && simStepB === 3 ? (
                sharedMemory === 2 ? (
                  <span className="text-primary font-bold text-sm">CORRECT (Serial Execution)</span>
                ) : (
                  <span className="text-critical font-bold text-sm">RACE! (Lost Update: 2 -&gt; 1)</span>
                )
              ) : (
                <span className="text-secondary italic">In progress...</span>
              )}
            </div>
            <button
              onClick={resetSim}
              className="flex items-center space-x-1 px-3 py-1 bg-card border border-border rounded hover:bg-panel"
            >
              <RotateCcw className="w-3 h-3 text-heading" />
              <span>Reset Simulation</span>
            </button>
          </div>

          {/* Exhaustive 20 Interleavings Model Explanation */}
          <div className="bg-paper border border-border rounded p-4 space-y-2 text-xs font-mono">
            <h4 className="font-bold text-heading text-sm">
              Mathematical Model: All 20 Interleavings of Two 3-Step Threads
            </h4>
            <p className="text-secondary leading-relaxed">
              For two threads A and B each executing 3 steps (READ, ADD, WRITE), the total number of
              distinct execution orders is 6! / (3! × 3!) = <strong>20 interleavings</strong>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="bg-card p-2 border border-border rounded">
                <span className="text-secondary text-[10px] block uppercase">Total Interleavings</span>
                <span className="text-heading font-semibold text-base">20</span>
              </div>
              <div className="bg-card p-2 border border-border rounded">
                <span className="text-secondary text-[10px] block uppercase">Correct (End at 2)</span>
                <span className="text-primary font-semibold text-base">2 (10%)</span>
              </div>
              <div className="bg-card p-2 border border-border rounded">
                <span className="text-secondary text-[10px] block uppercase">Lost Update (End at 1)</span>
                <span className="text-critical font-semibold text-base">18 (90%)</span>
              </div>
              <div className="bg-card p-2 border border-border rounded">
                <span className="text-secondary text-[10px] block uppercase">Failure Probability</span>
                <span className="text-critical font-semibold text-base">90.0%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
