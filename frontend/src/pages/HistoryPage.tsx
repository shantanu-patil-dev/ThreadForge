import React, { useState } from 'react';
import { SavedExperimentRun } from '../types';
import { historyStorage } from '../services/historyStorage';
import {
  Download, Upload, Trash2, GitCompare, Printer, Search, Filter,
  FileSpreadsheet, FileJson, AlertTriangle, CheckCircle2, Bookmark
} from 'lucide-react';

interface HistoryPageProps {
  history: SavedExperimentRun[];
  onRefreshHistory: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onRefreshHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExp, setFilterExp] = useState('all');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // Filtered runs
  const filteredRuns = history.filter((r) => {
    if (filterExp !== 'all' && r.experiment_type !== filterExp) return false;
    if (searchTerm) {
      const matchId = r.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchNotes = (r.user_notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = r.experiment_type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchId || matchNotes || matchType;
    }
    return true;
  });

  const toggleSelectRun = (id: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Delete ${selectedRunIds.length} selected runs?`)) {
      selectedRunIds.forEach((id) => historyStorage.delete(id));
      setSelectedRunIds([]);
      onRefreshHistory();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all stored experiment history? This cannot be undone.')) {
      historyStorage.clearAll();
      setSelectedRunIds([]);
      onRefreshHistory();
    }
  };

  const handleExportCsv = () => {
    const runsToExport =
      selectedRunIds.length > 0
        ? history.filter((r) => selectedRunIds.includes(r.id))
        : history;
    const csvContent = historyStorage.exportCsv(runsToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadforge_runs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const runsToExport =
      selectedRunIds.length > 0
        ? history.filter((r) => selectedRunIds.includes(r.id))
        : history;
    const jsonContent = historyStorage.exportJson(runsToExport);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadforge_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = historyStorage.importJson(content);
      if (res.error) {
        alert(`Import Error: ${res.error}`);
      } else {
        alert(`Successfully imported ${res.imported} runs.`);
        onRefreshHistory();
      }
    };
    reader.readAsText(file);
  };

  // Compare 2 runs
  const runsToCompare = history.filter((r) => selectedRunIds.includes(r.id)).slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-mono text-secondary uppercase">
            Analysis 10 • Persistence & Export
          </span>
          <h2 className="text-lg font-bold text-heading">Experiment History & Reports</h2>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <label className="flex items-center space-x-1 px-2.5 py-1 bg-paper border border-border rounded hover:bg-panel cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-heading" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={handleExportJson}
            disabled={history.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 bg-paper border border-border rounded hover:bg-panel disabled:opacity-40"
          >
            <FileJson className="w-3.5 h-3.5 text-heading" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={history.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 bg-paper border border-border rounded hover:bg-panel disabled:opacity-40"
            title="Export RFC 4180 CSV with formula injection defense"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-heading" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            disabled={history.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1 bg-paper border border-border rounded hover:bg-panel disabled:opacity-40"
          >
            <Printer className="w-3.5 h-3.5 text-heading" />
            <span>Print Report</span>
          </button>

          {selectedRunIds.length === 2 && (
            <button
              onClick={() => setIsComparing(!isComparing)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-primary text-white rounded font-semibold"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isComparing ? 'Close Diff' : 'Compare 2 Runs'}</span>
            </button>
          )}

          {selectedRunIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center space-x-1 px-2 py-1 bg-critical/10 text-critical border border-critical/30 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedRunIds.length})</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-2 py-1 text-secondary hover:text-critical"
              title="Clear all local history"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Compare Panel if toggled */}
      {isComparing && runsToCompare.length === 2 && (
        <div className="bg-card border-2 border-primary rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold text-heading font-mono flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-primary" />
              <span>Side-by-Side Run Comparison & Delta Analysis</span>
            </h3>
            <button
              onClick={() => setIsComparing(false)}
              className="text-xs font-mono text-secondary hover:text-heading"
            >
              Close Diff
            </button>
          </div>

          {/* Environment Mismatch Warning */}
          {runsToCompare[0].environment_snapshot?.platform !==
            runsToCompare[1].environment_snapshot?.platform && (
            <div className="bg-warning/15 border border-warning/30 text-heading p-2.5 rounded text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <span>
                Environment Mismatch: These runs were captured on different machines or platforms.
                Relative timing deltas reflect hardware variation as well as software differences.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            {/* Run A */}
            <div className="bg-paper p-3 border border-border rounded space-y-2">
              <div className="font-bold text-heading">
                Run A: {runsToCompare[0].experiment_type.toUpperCase()} ({runsToCompare[0].id})
              </div>
              <div>Platform: {runsToCompare[0].environment_snapshot?.platform}</div>
              <div>Cores: {runsToCompare[0].environment_snapshot?.cpu_count}</div>
              <div className="pt-2 border-t border-border/70">
                <span className="text-[10px] uppercase text-secondary block">Config</span>
                <pre className="text-[10px] overflow-x-auto">
                  {JSON.stringify(runsToCompare[0].configuration, null, 2)}
                </pre>
              </div>
            </div>

            {/* Run B */}
            <div className="bg-paper p-3 border border-border rounded space-y-2">
              <div className="font-bold text-heading">
                Run B: {runsToCompare[1].experiment_type.toUpperCase()} ({runsToCompare[1].id})
              </div>
              <div>Platform: {runsToCompare[1].environment_snapshot?.platform}</div>
              <div>Cores: {runsToCompare[1].environment_snapshot?.cpu_count}</div>
              <div className="pt-2 border-t border-border/70">
                <span className="text-[10px] uppercase text-secondary block">Config</span>
                <pre className="text-[10px] overflow-x-auto">
                  {JSON.stringify(runsToCompare[1].configuration, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search runs by ID, notes, or tags..."
            className="w-full bg-card border border-border rounded px-2.5 py-1 text-heading placeholder:text-secondary text-xs"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-secondary" />
          <select
            value={filterExp}
            onChange={(e) => setFilterExp(e.target.value)}
            className="bg-card border border-border rounded px-2.5 py-1 text-heading text-xs"
          >
            <option value="all">All Experiments</option>
            <option value="benchmark">Benchmark</option>
            <option value="race-condition">Race Condition</option>
            <option value="synchronization">Synchronization</option>
            <option value="deadlock">Deadlock</option>
            <option value="thread-pool">Thread Pool</option>
            <option value="scaling">Scaling</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      {filteredRuns.length > 0 ? (
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left border-collapse">
              <thead className="bg-panel text-heading font-semibold border-b border-border">
                <tr>
                  <th className="p-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedRunIds.length === filteredRuns.length && filteredRuns.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRunIds(filteredRuns.map((r) => r.id));
                        else setSelectedRunIds([]);
                      }}
                      className="rounded accent-primary"
                    />
                  </th>
                  <th className="p-2.5">Run ID & Timestamp</th>
                  <th className="p-2.5">Experiment</th>
                  <th className="p-2.5">Hardware Environment</th>
                  <th className="p-2.5">Config Summary</th>
                  <th className="p-2.5">Notes & Tags</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-panel/30">
                    <td className="p-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRunIds.includes(run.id)}
                        onChange={() => toggleSelectRun(run.id)}
                        className="rounded accent-primary"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-heading">{run.id}</div>
                      <div className="text-[10px] text-secondary">
                        {new Date(run.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-paper border border-border text-heading font-semibold uppercase text-[10px]">
                        {run.experiment_type}
                      </span>
                    </td>
                    <td className="p-2.5 text-secondary">
                      <div>
                        {run.environment_snapshot?.cpu_count} Cores • Python{' '}
                        {run.environment_snapshot?.python_version}
                      </div>
                      <div className="text-[10px] truncate max-w-xs">
                        {run.environment_snapshot?.platform}
                      </div>
                    </td>
                    <td className="p-2.5 text-secondary text-[11px] max-w-xs truncate">
                      {JSON.stringify(run.configuration)}
                    </td>
                    <td className="p-2.5">
                      {editingNotesId === run.id ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="bg-paper border border-border rounded px-1.5 py-0.5 text-xs text-heading"
                          />
                          <button
                            onClick={() => {
                              historyStorage.updateNotes(run.id, notesText);
                              setEditingNotesId(null);
                              onRefreshHistory();
                            }}
                            className="px-1.5 py-0.5 bg-primary text-white rounded text-[10px]"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNotesId(run.id);
                            setNotesText(run.user_notes || '');
                          }}
                          className="cursor-pointer hover:underline text-secondary italic"
                        >
                          {run.user_notes || 'Click to add notes...'}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => {
                          historyStorage.delete(run.id);
                          onRefreshHistory();
                        }}
                        className="p-1 hover:text-critical text-secondary"
                        title="Delete run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border border-dashed rounded p-12 text-center text-xs font-mono text-secondary space-y-2">
          <Bookmark className="w-8 h-8 text-secondary mx-auto opacity-50 mb-2" />
          <div className="font-semibold text-heading text-sm">Honest Empty History</div>
          <p className="max-w-md mx-auto">
            No saved experiments recorded in browser localStorage.
            Run any experiment and click 'Save' to persist reports and compare runs side-by-side.
          </p>
        </div>
      )}

      {/* Printable Report Disclaimer Footer */}
      <div className="text-[11px] text-secondary font-mono pt-4 border-t border-border">
        Standing Engineering Note: Real execution times, throughput, and speedups vary across machines,
        thermal states, operating system schedulers, and background workloads.
      </div>
    </div>
  );
};
