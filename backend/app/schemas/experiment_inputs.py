from typing import Optional, List
from pydantic import Field
from backend.app.schemas.base import StrictModel, WorkloadType, SyncMethod, DeadlockMode

class BenchmarkInput(StrictModel):
    workload: WorkloadType = WorkloadType.WAIT_BOUND
    tasks: int = Field(default=50, ge=1, le=10000)
    threads: int = Field(default=4, ge=1, le=64)
    processes: int = Field(default=4, ge=1, le=16)
    include_process_pool: bool = False
    include_startup_cost: bool = True
    wait_ms: float = Field(default=10.0, ge=0.0, le=500.0)
    cpu_intensity: int = Field(default=2000, ge=100, le=50000)
    trials: int = Field(default=3, ge=1, le=20)
    warmup_trials: int = Field(default=1, ge=0, le=3)
    timeout_seconds: int = Field(default=30, ge=1, le=120)

class RaceConditionInput(StrictModel):
    workers: int = Field(default=4, ge=1, le=64)
    increments_per_worker: int = Field(default=5000, ge=10, le=100000)
    sync_method: SyncMethod = SyncMethod.NONE
    race_window: str = Field(default="amplified", pattern="^(natural|amplified)$")
    switch_interval: float = Field(default=0.0001, ge=0.00001, le=0.05)
    trials: int = Field(default=3, ge=1, le=20)
    timeout_seconds: int = Field(default=30, ge=1, le=120)

class SynchronizationInput(StrictModel):
    strategies: List[SyncMethod] = Field(
        default=[SyncMethod.NONE, SyncMethod.MUTEX, SyncMethod.ATOMIC, SyncMethod.THREAD_LOCAL, SyncMethod.LOCK_STRIPING]
    )
    workers: int = Field(default=4, ge=1, le=64)
    increments_per_worker: int = Field(default=10000, ge=10, le=100000)
    stripe_count: int = Field(default=4, ge=2, le=32)
    trials: int = Field(default=3, ge=1, le=20)
    timeout_seconds: int = Field(default=30, ge=1, le=120)

class DeadlockInput(StrictModel):
    mode: DeadlockMode = DeadlockMode.CONTROLLED_DEADLOCK
    resource_count: int = Field(default=2, ge=2, le=5)
    task_count: int = Field(default=2, ge=2, le=5)
    timeout_seconds: int = Field(default=15, ge=1, le=60)
    lock_timeout_ms: int = Field(default=1500, ge=200, le=10000)

class ThreadPoolInput(StrictModel):
    workload: WorkloadType = WorkloadType.WAIT_BOUND
    tasks: int = Field(default=50, ge=1, le=2000)  # thread-per-task max 2000
    pool_workers: int = Field(default=4, ge=1, le=64)
    include_process_pool: bool = False
    wait_ms: float = Field(default=5.0, ge=0.0, le=500.0)
    cpu_intensity: int = Field(default=1500, ge=100, le=50000)
    trials: int = Field(default=3, ge=1, le=20)
    timeout_seconds: int = Field(default=30, ge=1, le=120)

class ScalingInput(StrictModel):
    workload: WorkloadType = WorkloadType.CPU_BOUND
    tasks: int = Field(default=40, ge=1, le=5000)
    worker_counts: List[int] = Field(default=[1, 2, 4, 8, 12])
    test_processes: bool = False
    wait_ms: float = Field(default=5.0, ge=0.0, le=500.0)
    cpu_intensity: int = Field(default=2500, ge=100, le=50000)
    trials: int = Field(default=2, ge=1, le=10)
    timeout_seconds: int = Field(default=45, ge=1, le=120)
