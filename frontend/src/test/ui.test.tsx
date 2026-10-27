import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LabReportCard } from '../components/LabReportCard';
import { OverviewDashboard } from '../pages/OverviewDashboard';

describe('UI Component Verification', () => {
  it('renders LabReportCard with verdict badge and metrics', () => {
    render(
      <LabReportCard
        title="Test Benchmark"
        verdict="CORRECT"
        verdictLabel="PASSED"
        configSummary={{ Tasks: 10, Threads: 2 }}
        metrics={[{ label: 'Throughput', value: '500', unit: 'tasks/s' }]}
        explanation="Speedup achieved under wait workload."
        teachingPanel={{
          whatToExpect: 'Linear speedup',
          whatThisShows: 'Concurrent execution',
          whatThisDoesNotProve: 'Arbitrary CPU speedup',
        }}
      />
    );

    expect(screen.getByText('Test Benchmark')).toBeInTheDocument();
    expect(screen.getByText('PASSED')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Explain this result:')).toBeInTheDocument();
  });

  it('renders honest empty state when no history exists in OverviewDashboard', () => {
    render(
      <OverviewDashboard
        catalog={[]}
        environment={{
          os_name: 'Windows',
          os_version: '11',
          platform: 'Win11',
          cpu_count: 8,
          python_version: '3.12.0',
          python_implementation: 'cpython',
          gil_enabled: true,
          free_threaded: false,
        }}
        activeJob={null}
        history={[]}
        onNavigate={() => {}}
        onQuickStart={() => {}}
      />
    );

    expect(screen.getByText(/Honest Empty State: No Runs Yet/i)).toBeInTheDocument();
  });
});
