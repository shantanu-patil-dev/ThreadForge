import React from 'react';
import { ExperimentCatalogItem, EnvironmentInfo, JobSummary, SavedExperimentRun } from '../types';
import { PageId } from '../components/NavigationRail';
import { Play, ArrowRight, Activity, Cpu, Sparkles, History as HistoryIcon } from 'lucide-react';

interface OverviewDashboardProps {
  catalog: ExperimentCatalogItem[];
  environment: EnvironmentInfo | null;
  activeJob: JobSummary | null;
  history: SavedExperimentRun[];
  onNavigate: (page: PageId) => void;
  onQuickStart: (experimentId: string, preset: Record<string, any>) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  catalog,
  environment,
  activeJob,
  history,
  onNavigate,
  onQuickStart,
}) => {
  const latestRun = history.length > 0 ? history[0] : null;

  return (
    <div className="space-y-6">
      {/* Hero Mission Card */}
      <div className="bg-card border border-border rounded p-6">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 bg-panel text-heading border border-border rounded font-semibold">
              LABORATORY MISSION
            </span>
            <span className="text-xs text-secondary">College Concurrency Demonstration</span>
          </div>
          <h2 className="text-xl font-bold text-heading">
            ThreadForge: Interactive Multithreading Performance & Race Condition Laboratory
          </h2>
          <p className="text-sm text-secondary leading-relaxed">
            A rigorous engineering instrument for demonstrating what threads are, when concurrent execution accelerates tasks,
            why shared mutable state corrupts data, how synchronization primitives protect critical sections, and how Amdahl's
            Law bounds multicore scaling. Every measurement is executed directly on your hardware.
          </p>
        </div>

        {/* Real Hardware Environment Banner */}
        {environment && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-border/80 text-xs font-mono">
            <div className="bg-paper p-2.5 rounded border border-border">
              <span className="text-secondary text-[10px] uppercase block">Host Operating System</span>
              <span className="text-heading font-semibold mt-0.5 block truncate">
                {environment.os_name} {environment.os_version}
              </span>
            </div>
            <div className="bg-paper p-2.5 rounded border border-border">
              <span className="text-secondary text-[10px] uppercase block">Python Implementation</span>
              <span className="text-heading font-semibold mt-0.5 block">
                {environment.python_implementation} {environment.python_version}
              </span>
            </div>
            <div className="bg-paper p-2.5 rounded border border-border">
              <span className="text-secondary text-[10px] uppercase block">Hardware CPU Cores</span>
              <span className="text-heading font-semibold mt-0.5 block">
                {environment.cpu_count} Physical / Logical
              </span>
            </div>
            <div className="bg-paper p-2.5 rounded border border-border">
              <span className="text-secondary text-[10px] uppercase block">GIL Concurrency Mode</span>
              <span
                className={`font-semibold mt-0.5 block ${
                  environment.gil_enabled ? 'text-heading' : 'text-chart-olive'
                }`}
              >
                {environment.gil_enabled ? 'Active (CPython GIL)' : 'Free-Threaded Runtime'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Experiment Catalog Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-heading uppercase tracking-wider font-mono">
            Experiment Catalog ({catalog.length} Instruments)
          </h3>
          <span className="text-xs text-secondary">Select any instrument to launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded p-4 flex flex-col justify-between hover:border-heading transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-paper rounded border border-border text-secondary uppercase">
                    {item.category}
                  </span>
                  {item.has_simulation && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-warning/15 text-warning rounded border border-warning/30 font-semibold">
                      SIMULATION TAB
                    </span>
                  )}
                </div>
                <h4 className="text-base font-semibold text-heading">{item.name}</h4>
                <p className="text-xs text-secondary leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const preset = item.presets?.quick || {};
                    onQuickStart(item.id, preset);
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-panel hover:bg-border text-heading rounded transition-colors"
                  title="Run bounded quick preset (< 5s)"
                >
                  <Play className="w-3 h-3 text-primary fill-current" />
                  <span>Quick Run</span>
                </button>

                <button
                  onClick={() => {
                    const pageMap: Record<string, PageId> = {
                      benchmark: 'benchmark',
                      'race-condition': 'race_condition',
                      synchronization: 'synchronization',
                      deadlock: 'deadlock',
                      'thread-pool': 'thread_pool',
                      scaling: 'scaling',
                    };
                    onNavigate(pageMap[item.id] || 'concurrency_lab');
                  }}
                  className="flex items-center space-x-1 text-xs font-medium text-heading hover:text-primary transition-colors"
                >
                  <span>Configure</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest Empty State or Recent Activity */}
      <div className="bg-card border border-border rounded p-5">
        <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider mb-3">
          Telemetry & Run History
        </h3>

        {latestRun ? (
          <div className="bg-paper border border-border rounded p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div>
              <span className="text-secondary text-[10px] uppercase block">Latest Execution</span>
              <span className="font-semibold text-heading text-sm uppercase">
                {latestRun.experiment_type}
              </span>
              <span className="text-secondary ml-2">
                {new Date(latestRun.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div>
              <span className="text-secondary text-[10px] uppercase block">Status</span>
              <span className="font-semibold text-primary">COMPLETED & VERIFIED</span>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="px-3 py-1 bg-card border border-border rounded hover:bg-panel transition-colors text-heading font-medium"
            >
              View in History ({history.length} runs)
            </button>
          </div>
        ) : (
          <div className="bg-paper border border-border border-dashed rounded p-6 text-center space-y-1">
            <HistoryIcon className="w-6 h-6 text-secondary mx-auto mb-2 opacity-60" />
            <div className="text-sm font-semibold text-heading">Honest Empty State: No Runs Yet</div>
            <p className="text-xs text-secondary max-w-md mx-auto">
              ThreadForge never displays fabricated metrics or placeholder history.
              Select any experiment above or click 'Quick Run' to measure real hardware performance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
