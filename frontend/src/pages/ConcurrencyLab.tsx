import React, { useState } from 'react';
import { ExperimentCatalogItem, EnvironmentInfo } from '../types';
import { PageId } from '../components/NavigationRail';
import { Play, ArrowRight, Settings2, Sliders, Zap } from 'lucide-react';

interface ConcurrencyLabProps {
  catalog: ExperimentCatalogItem[];
  environment: EnvironmentInfo | null;
  onNavigate: (page: PageId) => void;
  onQuickRun: (experimentId: string, params: Record<string, any>) => void;
}

export const ConcurrencyLab: React.FC<ConcurrencyLabProps> = ({
  catalog,
  environment,
  onNavigate,
  onQuickRun,
}) => {
  const [selectedExperiment, setSelectedExperiment] = useState<string>('benchmark');
  const [customParams, setCustomParams] = useState<Record<string, any>>({
    tasks: 40,
    threads: 4,
    wait_ms: 10,
    trials: 2,
  });

  const pageMap: Record<string, PageId> = {
    benchmark: 'benchmark',
    'race-condition': 'race_condition',
    synchronization: 'synchronization',
    deadlock: 'deadlock',
    'thread-pool': 'thread_pool',
    scaling: 'scaling',
  };

  const currentItem = catalog.find((c) => c.id === selectedExperiment) || catalog[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Experiment 02 • Universal Experiment Builder
          </span>
          <h2 className="text-lg font-bold text-heading">Concurrency Laboratory Console</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector & Config Panel */}
        <div className="bg-card border border-border rounded p-4 space-y-4">
          <h3 className="text-xs font-mono font-semibold text-heading uppercase tracking-wider border-b border-border pb-2 flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-secondary" />
            <span>Select Target Experiment</span>
          </h3>

          <div className="space-y-1">
            {catalog.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedExperiment(item.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                  selectedExperiment === item.id
                    ? 'bg-panel font-bold text-heading border-l-2 border-primary'
                    : 'text-secondary hover:bg-paper hover:text-heading'
                }`}
              >
                <span>{item.name}</span>
                <span className="text-[10px] uppercase text-secondary">[{item.category}]</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <button
              onClick={() => onNavigate(pageMap[selectedExperiment] || 'benchmark')}
              className="w-full py-2 px-3 bg-panel hover:bg-border text-heading text-xs font-semibold rounded flex items-center justify-center space-x-1.5 transition-colors border border-border"
            >
              <span>Open Deep-Dive Instrument</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onQuickRun(selectedExperiment, currentItem?.presets?.quick || {})}
              className="w-full py-2 px-3 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Fast Execute Preset</span>
            </button>
          </div>
        </div>

        {/* Experiment Specification & Presets */}
        <div className="lg:col-span-2 space-y-4">
          {currentItem && (
            <div className="bg-card border border-border rounded p-5 space-y-4">
              <div className="border-b border-border pb-3">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-paper rounded border border-border text-secondary">
                  {currentItem.category}
                </span>
                <h3 className="text-lg font-bold text-heading mt-2">{currentItem.name}</h3>
                <p className="text-xs text-secondary leading-relaxed mt-1">
                  {currentItem.description}
                </p>
              </div>

              {/* Core Teaching Points */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-semibold text-heading uppercase">
                  Core Engineering Concepts
                </h4>
                <ul className="space-y-1.5 text-xs text-secondary font-mono">
                  {currentItem.teaching_points.map((pt, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-primary font-bold">›</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Presets Table */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-mono font-semibold text-heading uppercase">
                  Available Bounded Presets
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(currentItem.presets || {}).map(([presetName, pConfig]) => (
                    <div
                      key={presetName}
                      className="bg-paper border border-border rounded p-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-heading font-mono uppercase">
                          {presetName}
                        </div>
                        <div className="text-[11px] font-mono text-secondary mt-1 space-y-0.5">
                          {Object.entries(pConfig).map(([k, v]) => (
                            <div key={k}>
                              {k}: <span className="font-semibold text-heading">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => onQuickRun(selectedExperiment, pConfig)}
                        className="mt-3 w-full py-1 px-2 text-xs font-semibold bg-panel hover:bg-border text-heading rounded flex items-center justify-center space-x-1"
                      >
                        <Play className="w-3 h-3 text-primary fill-current" />
                        <span>Run {presetName}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
