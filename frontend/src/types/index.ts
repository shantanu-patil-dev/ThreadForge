export interface EnvironmentInfo {
  os_name: string;
  os_version: string;
  platform: string;
  cpu_count: number;
  python_version: string;
  python_implementation: string;
  gil_enabled: boolean;
  free_threaded: boolean;
}

export interface ServerLimits {
  max_tasks: number;
  max_thread_per_task: number;
  min_threads: number;
  max_threads: number;
  min_processes: number;
  max_processes: number;
  min_trials: number;
  max_trials: number;
  min_warmup: number;
  max_warmup: number;
  max_wait_ms: number;
  default_timeout_s: number;
  max_timeout_s: number;
  max_request_bytes: number;
}

export interface ExperimentCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  teaching_points: string[];
  has_simulation: boolean;
  presets: Record<string, Record<string, any>>;
}

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'timed_out';

export interface JobSummary {
  job_id: string;
  experiment_type: string;
  status: JobStatus;
  progress_percent: number;
  current_trial: number;
  total_trials: number;
  completed_tasks: number;
  total_tasks: number;
  message: string;
  created_at_iso: string;
  result?: any;
  error?: string;
}

export interface TraceEvent {
  run_id: string;
  task_id: number;
  worker_id: string;
  kind: 'queued' | 'started' | 'waiting' | 'acquired' | 'released' | 'finished' | 'failed' | 'cancelled';
  t_ns: number;
  duration_ns?: number;
  meta?: Record<string, any>;
}

export interface SummaryStats {
  min_ms: number;
  median_ms: number;
  mean_ms: number;
  std_dev_ms: number;
  p95_ms: number;
  cv_percent: number;
  is_noisy: boolean;
}

export interface ApproachResult {
  name: string;
  durations_ms: number[];
  stats: SummaryStats;
  speedup_median?: number;
  speedup_mean?: number;
  efficiency_median?: number;
  throughput_tasks_per_sec: number;
  karp_flatt_serial_fraction?: number;
  correctness_verified: boolean;
  startup_cost_ms?: number;
  steady_state_ms?: number;
}

export interface BenchmarkResult {
  workload: string;
  tasks: number;
  threads: number;
  processes?: number;
  approaches: Record<string, ApproachResult>;
  explanation: string;
  variability_disclosure: string;
  traces: TraceEvent[];
}

export interface RaceConditionTrial {
  trial_index: number;
  expected: number;
  actual: number;
  lost_updates: number;
  lost_percentage: number;
  duration_ms: number;
  is_correct: boolean;
}

export interface RaceConditionResult {
  workers: number;
  increments_per_worker: number;
  expected_total: number;
  sync_method: string;
  race_window: string;
  trials: RaceConditionTrial[];
  failed_trials_count: number;
  total_trials_count: number;
  average_duration_ms: number;
  verdict: string;
  explanation: string;
  cpython_atomic_detail_notice?: string;
  traces: TraceEvent[];
}

export interface StrategyResult {
  method: string;
  correctness: boolean;
  is_fast_but_wrong: boolean;
  expected: number;
  actual: number;
  lost_updates: number;
  stats: SummaryStats;
  overhead_vs_thread_local_ms?: number;
  overhead_percent?: number;
  throughput: number;
}

export interface SynchronizationResult {
  workers: number;
  increments_per_worker: number;
  strategies: Record<string, StrategyResult>;
  explanation: string;
  traces: TraceEvent[];
}

export interface ResourceGraphNode {
  id: string;
  label: string;
  type: 'task' | 'resource';
}

export interface ResourceGraphEdge {
  source: string;
  target: string;
  type: 'owns' | 'waits_for';
  is_cycle?: boolean;
}

export interface CoffmanState {
  mutual_exclusion: boolean;
  hold_and_wait: boolean;
  no_preemption: boolean;
  circular_wait: boolean;
  deadlock_present: boolean;
  explanation: string;
}

export interface DeadlockResult {
  mode: string;
  cycle_detected: boolean;
  cycle_nodes: string[];
  graph_nodes: ResourceGraphNode[];
  graph_edges: ResourceGraphEdge[];
  coffman: CoffmanState;
  tasks_completed: number;
  tasks_aborted_or_timed_out: number;
  explanation: string;
  traces: TraceEvent[];
}

export interface PoolApproachResult {
  name: string;
  total_time_ms: number;
  avg_queue_wait_ms: number;
  avg_task_run_ms: number;
  thread_creation_overhead_ms?: number;
  worker_utilization_percent: number;
  throughput_tasks_per_sec: number;
  correctness: boolean;
}

export interface ThreadPoolResult {
  tasks: number;
  pool_workers: number;
  workload: string;
  approaches: Record<string, PoolApproachResult>;
  thread_creation_microbenchmark_ns: number;
  explanation: string;
  traces: TraceEvent[];
}

export interface ScalingPoint {
  workers: number;
  duration_ms: number;
  throughput_tasks_per_sec: number;
  speedup: number;
  efficiency: number;
  error: boolean;
}

export interface ScalingCurve {
  type: string;
  points: ScalingPoint[];
  amdahl_fitted_serial_fraction?: number;
  amdahl_curve_points: Array<{ workers: number; model_speedup: number }>;
}

export interface ScalingResult {
  workload: string;
  tasks: number;
  curves: ScalingCurve[];
  explanation: string;
  traces: TraceEvent[];
}

export interface SavedExperimentRun {
  id: string;
  experiment_type: string;
  timestamp: string;
  environment_snapshot: EnvironmentInfo;
  configuration: Record<string, any>;
  result: any;
  user_notes?: string;
  tags?: string[];
}
