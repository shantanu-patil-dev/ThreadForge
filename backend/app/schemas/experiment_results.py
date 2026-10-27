from typing import Optional, List, Dict, Any
from backend.app.schemas.base import StrictModel, SyncMethod, DeadlockMode, WorkloadType
from backend.app.schemas.trace import TraceEvent

class SummaryStats(StrictModel):
    min_ms: float
    median_ms: float
    mean_ms: float
    std_dev_ms: float
    p95_ms: float
    cv_percent: float
    is_noisy: bool

class ApproachResult(StrictModel):
    name: str
    durations_ms: List[float]
    stats: SummaryStats
    speedup_median: Optional[float] = None
    speedup_mean: Optional[float] = None
    efficiency_median: Optional[float] = None
    throughput_tasks_per_sec: float
    karp_flatt_serial_fraction: Optional[float] = None
    correctness_verified: bool
    expected_value: Optional[int] = None
    actual_value: Optional[int] = None
    error_message: Optional[str] = None
    startup_cost_ms: Optional[float] = None
    steady_state_ms: Optional[float] = None

class BenchmarkResult(StrictModel):
    workload: WorkloadType
    tasks: int
    threads: int
    processes: Optional[int] = None
    approaches: Dict[str, ApproachResult]
    explanation: str
    variability_disclosure: str
    traces: List[TraceEvent] = []

class RaceConditionTrial(StrictModel):
    trial_index: int
    expected: int
    actual: int
    lost_updates: int
    lost_percentage: float
    duration_ms: float
    is_correct: bool

class RaceConditionResult(StrictModel):
    workers: int
    increments_per_worker: int
    expected_total: int
    sync_method: SyncMethod
    race_window: str
    trials: List[RaceConditionTrial]
    failed_trials_count: int
    total_trials_count: int
    average_duration_ms: float
    verdict: str  # "CORRECT", "RACE_CONDITION_DETECTED", "NO_RACE_OBSERVED_NOT_PROOF"
    explanation: str
    cpython_atomic_detail_notice: Optional[str] = None
    traces: List[TraceEvent] = []

class StrategyResult(StrictModel):
    method: SyncMethod
    correctness: bool
    is_fast_but_wrong: bool
    expected: int
    actual: int
    lost_updates: int
    stats: SummaryStats
    overhead_vs_thread_local_ms: Optional[float] = None
    overhead_percent: Optional[float] = None
    throughput: float

class SynchronizationResult(StrictModel):
    workers: int
    increments_per_worker: int
    strategies: Dict[str, StrategyResult]
    explanation: str
    traces: List[TraceEvent] = []

class ResourceGraphNode(StrictModel):
    id: str
    label: str
    type: str  # "task" or "resource"

class ResourceGraphEdge(StrictModel):
    source: str
    target: str
    type: str  # "owns" or "waits_for"
    is_cycle: bool = False

class CoffmanState(StrictModel):
    mutual_exclusion: bool
    hold_and_wait: bool
    no_preemption: bool
    circular_wait: bool
    deadlock_present: bool
    explanation: str

class DeadlockResult(StrictModel):
    mode: DeadlockMode
    cycle_detected: bool
    cycle_nodes: List[str]
    graph_nodes: List[ResourceGraphNode]
    graph_edges: List[ResourceGraphEdge]
    coffman: CoffmanState
    tasks_completed: int
    tasks_aborted_or_timed_out: int
    explanation: str
    traces: List[TraceEvent] = []

class PoolApproachResult(StrictModel):
    name: str
    total_time_ms: float
    avg_queue_wait_ms: float
    avg_task_run_ms: float
    thread_creation_overhead_ms: Optional[float] = None
    worker_utilization_percent: float
    throughput_tasks_per_sec: float
    correctness: bool

class ThreadPoolResult(StrictModel):
    tasks: int
    pool_workers: int
    workload: WorkloadType
    approaches: Dict[str, PoolApproachResult]
    thread_creation_microbenchmark_ns: float
    explanation: str
    traces: List[TraceEvent] = []

class ScalingPoint(StrictModel):
    workers: int
    duration_ms: float
    throughput_tasks_per_sec: float
    speedup: float
    efficiency: float
    error: bool = False

class ScalingCurve(StrictModel):
    type: str  # "threads" or "processes"
    points: List[ScalingPoint]
    amdahl_fitted_serial_fraction: Optional[float] = None
    amdahl_curve_points: List[Dict[str, float]] = []

class ScalingResult(StrictModel):
    workload: WorkloadType
    tasks: int
    curves: List[ScalingCurve]
    explanation: str
    traces: List[TraceEvent] = []
