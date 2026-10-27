import { SavedExperimentRun, EnvironmentInfo } from '../types';

const STORAGE_KEY = 'threadforge_history_v2';
const MAX_SAVED_RUNS = 50;

export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let s = String(val);
  // RFC 4180 Formula injection defense: escape leading =, +, -, @
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  // Escape quotes
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    s = `"${s.replace(/"/g, '""')}"`;
  } else {
    s = `"${s}"`;
  }
  return s;
}

export const historyStorage = {
  getAll(): SavedExperimentRun[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  },

  save(run: Omit<SavedExperimentRun, 'id'>): SavedExperimentRun | null {
    const runs = this.getAll();
    const newRun: SavedExperimentRun = {
      ...run,
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    // Compact traces for oldest runs to prevent quota issues
    const updated = [newRun, ...runs].slice(0, MAX_SAVED_RUNS);

    // Keep full trace only for the 10 most recent runs
    updated.forEach((r, idx) => {
      if (idx >= 10 && r.result?.traces) {
        r.result = { ...r.result, traces: [] };
      }
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newRun;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        // Drop oldest 10 runs to recover space
        const trimmed = updated.slice(0, Math.max(1, updated.length - 10));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
          return newRun;
        } catch {
          console.warn('LocalStorage quota exceeded even after trimming');
          return null;
        }
      }
      return null;
    }
  },

  delete(id: string): void {
    const runs = this.getAll().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  updateNotes(id: string, notes: string, tags?: string[]): void {
    const runs = this.getAll().map((r) => {
      if (r.id === id) {
        return { ...r, user_notes: notes, tags: tags || r.tags };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  },

  exportCsv(runs: SavedExperimentRun[]): string {
    const headers = [
      'Run ID',
      'Experiment',
      'Timestamp',
      'Platform',
      'CPU Cores',
      'Python Version',
      'GIL Enabled',
      'Configuration',
      'Throughput (tasks/s)',
      'Speedup',
      'Verdict / Correctness',
      'User Notes',
      'Tags',
    ];

    const rows = runs.map((r) => {
      let speedup = '';
      let throughput = '';
      let correctness = '';

      if (r.result?.approaches?.ThreadPool) {
        speedup = String(r.result.approaches.ThreadPool.speedup_median || '');
        throughput = String(r.result.approaches.ThreadPool.throughput_tasks_per_sec || '');
        correctness = r.result.approaches.ThreadPool.correctness_verified ? 'CORRECT' : 'ERROR';
      } else if (r.result?.verdict) {
        correctness = r.result.verdict;
      } else if (r.result?.strategies) {
        correctness = Object.values(r.result.strategies).every((s: any) => s.correctness) ? 'CORRECT' : 'FAILED';
      }

      return [
        escapeCsvCell(r.id),
        escapeCsvCell(r.experiment_type),
        escapeCsvCell(r.timestamp),
        escapeCsvCell(r.environment_snapshot?.platform || ''),
        escapeCsvCell(r.environment_snapshot?.cpu_count || ''),
        escapeCsvCell(r.environment_snapshot?.python_version || ''),
        escapeCsvCell(r.environment_snapshot?.gil_enabled ? 'YES' : 'NO'),
        escapeCsvCell(JSON.stringify(r.configuration)),
        escapeCsvCell(throughput),
        escapeCsvCell(speedup),
        escapeCsvCell(correctness),
        escapeCsvCell(r.user_notes || ''),
        escapeCsvCell((r.tags || []).join(', ')),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  },

  exportJson(runs: SavedExperimentRun[]): string {
    return JSON.stringify({
      version: 'threadforge_v2',
      exported_at: new Date().toISOString(),
      runs,
    }, null, 2);
  },

  importJson(jsonString: string): { imported: number; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      const importedRuns: SavedExperimentRun[] = Array.isArray(data) ? data : data.runs;
      if (!Array.isArray(importedRuns)) {
        return { imported: 0, error: 'Invalid JSON format: expected an array of experiment runs' };
      }
      const existing = this.getAll();
      const existingIds = new Set(existing.map((r) => r.id));
      const newItems = importedRuns.filter((r) => r && r.id && !existingIds.has(r.id));
      const merged = [...newItems, ...existing].slice(0, MAX_SAVED_RUNS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return { imported: newItems.length };
    } catch (e: any) {
      return { imported: 0, error: e.message || 'JSON parse error' };
    }
  },
};
