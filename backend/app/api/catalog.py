from fastapi import APIRouter
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter()

class ExperimentCatalogItem(BaseModel):
    id: str
    name: str
    category: str
    description: str
    teaching_points: List[str]
    has_simulation: bool
    presets: Dict[str, Dict[str, Any]]

@router.get("/experiments", response_model=List[ExperimentCatalogItem])
def get_catalog():
    return [
        ExperimentCatalogItem(
            id="benchmark",
            name="Performance Benchmark",
            category="Performance",
            description="Measure real speedup, efficiency, and Karp-Flatt serial fraction comparing Sequential, ThreadPool, and ProcessPool across wait-bound, CPU-bound, and GIL-releasing workloads.",
            teaching_points=[
                "Why wait-bound tasks scale with threads while pure-Python CPU tasks do not under the GIL.",
                "How C-extension operations (hashlib, zlib) release the GIL to enable true multicore execution.",
                "How process spawning overhead under Windows affects short-lived batch jobs."
            ],
            has_simulation=False,
            presets={
                "quick": {"workload": "wait_bound", "tasks": 30, "threads": 4, "wait_ms": 5, "trials": 2, "warmup_trials": 0},
                "classroom": {"workload": "wait_bound", "tasks": 80, "threads": 8, "wait_ms": 10, "trials": 3, "warmup_trials": 1},
                "thorough": {"workload": "wait_bound", "tasks": 200, "threads": 12, "wait_ms": 10, "trials": 5, "warmup_trials": 2}
            }
        ),
        ExperimentCatalogItem(
            id="race-condition",
            name="Race Condition Laboratory",
            category="Concurrency Hazards",
            description="Demonstrate how concurrent unsynchronized increments lose updates due to preemptive thread scheduling, with REAL multi-trial testing and an exhaustive SIMULATION interleaving model.",
            teaching_points=[
                "Why non-atomic read-modify-write operations fail without locks.",
                "How explicit yield (amplified window) exposes scheduling vulnerabilities.",
                "Why absence of observed race conditions under the GIL does not equal safety."
            ],
            has_simulation=True,
            presets={
                "quick": {"workers": 4, "increments_per_worker": 2000, "sync_method": "none", "race_window": "amplified", "trials": 3},
                "classroom": {"workers": 8, "increments_per_worker": 5000, "sync_method": "none", "race_window": "amplified", "trials": 5},
                "thorough": {"workers": 12, "increments_per_worker": 10000, "sync_method": "none", "race_window": "amplified", "trials": 10}
            }
        ),
        ExperimentCatalogItem(
            id="synchronization",
            name="Synchronization Comparison",
            category="Concurrency Protection",
            description="Evaluate none, mutex, atomic, thread-local accumulation, and lock striping across correctness, runtime, and overhead measured against the thread-local baseline.",
            teaching_points=[
                "Correctness is prerequisite: fast-but-wrong execution is a critical fault.",
                "Thread-local accumulation eliminates contention during computation.",
                "Lock striping partitions contention for high-concurrency shared collections."
            ],
            has_simulation=False,
            presets={
                "quick": {"workers": 4, "increments_per_worker": 5000, "stripe_count": 4, "trials": 2},
                "classroom": {"workers": 8, "increments_per_worker": 15000, "stripe_count": 8, "trials": 3},
                "thorough": {"workers": 12, "increments_per_worker": 30000, "stripe_count": 8, "trials": 5}
            }
        ),
        ExperimentCatalogItem(
            id="deadlock",
            name="Deadlock Playground",
            category="Concurrency Hazards",
            description="Experience genuine thread blocking with TracedLock, automated wait-for graph cycle detection, interactive Coffman conditions panel, and ordered lock recovery.",
            teaching_points=[
                "The four Coffman conditions required for deadlock.",
                "How circular wait in resource allocation graphs causes unrecoverable hangs.",
                "How strict lock ordering and timeout-based backoff break deadlock."
            ],
            has_simulation=False,
            presets={
                "quick": {"mode": "controlled_deadlock", "resource_count": 2, "task_count": 2, "lock_timeout_ms": 1200},
                "classroom": {"mode": "detection", "resource_count": 3, "task_count": 3, "lock_timeout_ms": 1500},
                "thorough": {"mode": "recovery", "resource_count": 2, "task_count": 2, "lock_timeout_ms": 1000}
            }
        ),
        ExperimentCatalogItem(
            id="thread-pool",
            name="Thread Pool Optimizer",
            category="Resource Management",
            description="Analyze sequential execution vs thread-per-task vs fixed ThreadPoolExecutor, measuring OS thread-creation microbenchmark, queue wait latency, and worker utilization.",
            teaching_points=[
                "Kernel thread allocation and teardown costs exposed by microbenchmarks.",
                "Queue waiting time trade-offs between fixed pools and unbounded threads.",
                "When thread pools win and when small tasks suffer allocation overhead."
            ],
            has_simulation=False,
            presets={
                "quick": {"workload": "wait_bound", "tasks": 40, "pool_workers": 4, "wait_ms": 5},
                "classroom": {"workload": "wait_bound", "tasks": 100, "pool_workers": 8, "wait_ms": 5},
                "thorough": {"workload": "cpu_bound", "tasks": 60, "pool_workers": 8, "cpu_intensity": 1500}
            }
        ),
        ExperimentCatalogItem(
            id="scaling",
            name="Scaling Analyzer",
            category="Performance",
            description="Evaluate worker scaling across CPU cores, plotting time, throughput, speedup, and efficiency alongside an Amdahl's Law fitted serial-fraction curve.",
            teaching_points=[
                "Diminishing returns and negative scaling past hardware core capacity.",
                "How Amdahl's Law models maximum achievable speedup from serial fraction.",
                "The impact of context switching, thread migration, and memory bus contention."
            ],
            has_simulation=False,
            presets={
                "quick": {"workload": "wait_bound", "tasks": 50, "worker_counts": [1, 2, 4, 8], "wait_ms": 5},
                "classroom": {"workload": "gil_releasing", "tasks": 40, "worker_counts": [1, 2, 4, 8, 12], "cpu_intensity": 1500},
                "thorough": {"workload": "cpu_bound", "tasks": 60, "worker_counts": [1, 2, 4, 8, 12], "test_processes": True}
            }
        )
    ]
