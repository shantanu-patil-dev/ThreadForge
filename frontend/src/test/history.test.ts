import { describe, it, expect, beforeEach } from 'vitest';
import { escapeCsvCell, historyStorage } from '../services/historyStorage';

describe('historyStorage & CSV RFC 4180 Escaping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('escapes cells starting with =, +, -, @ to prevent formula injection', () => {
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvCell('+cmd|')).toBe(`"'+cmd|"`);
    expect(escapeCsvCell('-SUM(A1:A5)')).toBe(`"'-SUM(A1:A5)"`);
    expect(escapeCsvCell('@calc')).toBe(`"'@calc"`);
    expect(escapeCsvCell('Normal Text')).toBe('"Normal Text"');
  });

  it('persists and retrieves experiment runs', () => {
    const mockRun = {
      experiment_type: 'benchmark',
      timestamp: new Date().toISOString(),
      environment_snapshot: {
        os_name: 'Windows',
        os_version: '11',
        platform: 'Win11',
        cpu_count: 8,
        python_version: '3.12.0',
        python_implementation: 'cpython',
        gil_enabled: true,
        free_threaded: false,
      },
      configuration: { tasks: 10 },
      result: { status: 'ok' },
    };

    const saved = historyStorage.save(mockRun);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBeDefined();

    const all = historyStorage.getAll();
    expect(all.length).toBe(1);
    expect(all[0].experiment_type).toBe('benchmark');
  });

  it('exports RFC 4180 compliant CSV', () => {
    const mockRun = {
      experiment_type: 'race-condition',
      timestamp: '2026-10-27T10:00:00Z',
      environment_snapshot: {
        os_name: 'Windows',
        os_version: '11',
        platform: 'Win11',
        cpu_count: 8,
        python_version: '3.12.0',
        python_implementation: 'cpython',
        gil_enabled: true,
        free_threaded: false,
      },
      configuration: { workers: 4 },
      result: { verdict: 'CORRECT' },
      user_notes: '=Injected Formula Note',
    };

    historyStorage.save(mockRun);
    const csv = historyStorage.exportCsv(historyStorage.getAll());
    expect(csv).toContain('Run ID,Experiment,Timestamp');
    // Formula defense: =Injected Formula Note should have leading single quote
    expect(csv).toContain(`"'=Injected Formula Note"`);
  });

  it('exports and imports JSON validated runs', () => {
    const mockRun = {
      experiment_type: 'deadlock',
      timestamp: new Date().toISOString(),
      environment_snapshot: {
        os_name: 'Windows',
        os_version: '11',
        platform: 'Win11',
        cpu_count: 8,
        python_version: '3.12.0',
        python_implementation: 'cpython',
        gil_enabled: true,
        free_threaded: false,
      },
      configuration: { mode: 'safe_ordering' },
      result: { cycle_detected: false },
    };

    historyStorage.save(mockRun);
    const exportedJson = historyStorage.exportJson(historyStorage.getAll());
    
    // Clear storage and re-import
    localStorage.clear();
    expect(historyStorage.getAll().length).toBe(0);

    const importRes = historyStorage.importJson(exportedJson);
    expect(importRes.imported).toBe(1);
    expect(historyStorage.getAll().length).toBe(1);
  });
});
