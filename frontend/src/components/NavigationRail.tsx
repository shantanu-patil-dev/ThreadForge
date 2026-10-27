import React from 'react';
import {
  LayoutDashboard, FlaskConical, Gauge, AlertTriangle, ShieldCheck,
  Lock, Layers, GitGraph, TrendingUp, History, BookOpen
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'concurrency_lab'
  | 'benchmark'
  | 'race_condition'
  | 'synchronization'
  | 'deadlock'
  | 'thread_pool'
  | 'timeline'
  | 'scaling'
  | 'history'
  | 'documentation';

interface NavItem {
  id: PageId;
  num: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LEARN_ITEMS: NavItem[] = [
  { id: 'overview', num: '01', label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'documentation', num: '11', label: 'Docs & Viva Prep', icon: BookOpen },
];

const EXPERIMENT_ITEMS: NavItem[] = [
  { id: 'concurrency_lab', num: '02', label: 'Concurrency Lab', icon: FlaskConical },
  { id: 'benchmark', num: '03', label: 'Performance Benchmark', icon: Gauge },
  { id: 'race_condition', num: '04', label: 'Race Condition Lab', icon: AlertTriangle },
  { id: 'synchronization', num: '05', label: 'Synchronization', icon: ShieldCheck },
  { id: 'deadlock', num: '06', label: 'Deadlock Playground', icon: Lock },
  { id: 'thread_pool', num: '07', label: 'Thread Pool Optimizer', icon: Layers },
  { id: 'scaling', num: '09', label: 'Scaling Analyzer', icon: TrendingUp },
];

const ANALYZE_ITEMS: NavItem[] = [
  { id: 'timeline', num: '08', label: 'Thread Timeline', icon: GitGraph },
  { id: 'history', num: '10', label: 'Experiment History', icon: History },
];

interface NavigationRailProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentPage,
  onSelectPage,
}) => {
  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="mb-5">
      <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider text-secondary uppercase font-semibold">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium text-left transition-colors ${
                isActive
                  ? 'bg-panel text-heading font-semibold border-l-2 border-primary'
                  : 'text-secondary hover:bg-panel/50 hover:text-heading'
              }`}
            >
              <span className="font-mono text-[10px] text-heading/70 w-4">
                {item.num}
              </span>
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-secondary'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <nav className="w-56 shrink-0 bg-card border-r border-border h-[calc(100vh-3.5rem)] flex flex-col justify-between py-3 overflow-y-auto select-none">
      <div>
        {renderGroup('LEARN', LEARN_ITEMS)}
        {renderGroup('EXPERIMENT', EXPERIMENT_ITEMS)}
        {renderGroup('ANALYZE', ANALYZE_ITEMS)}
      </div>

      <div className="px-3 pt-3 border-t border-border/60">
        <div className="text-[10px] font-mono text-secondary">
          ThreadForge v2.0
        </div>
        <div className="text-[10px] text-secondary mt-0.5">
          Engineering Concurrency Lab
        </div>
      </div>
    </nav>
  );
};
