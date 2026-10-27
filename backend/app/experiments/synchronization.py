import time
import threading
import itertools
from typing import Dict, Any, List
from backend.app.schemas.base import SyncMethod, TraceEventKind
from backend.app.schemas.experiment_inputs import SynchronizationInput
from backend.app.schemas.experiment_results import (
    SynchronizationResult, StrategyResult
)
from backend.app.experiments.benchmark import _calculate_stats
from backend.app.services.instrumentation import TraceRecorder

def run_synchronization_experiment(params: SynchronizationInput, job_context: Any = None) -> Dict[str, Any]:
    run_id = job_context.job_id if job_context else "sync-local"
    recorder = TraceRecorder(run_id=run_id, is_simulation=False)
    
    expected_total = params.workers * params.increments_per_worker
    strategy_durations: Dict[str, List[float]] = {s.value: [] for s in params.strategies}
    strategy_actuals: Dict[str, int] = {}
    
    if job_context:
        job_context.total_trials = params.trials
        job_context.total_tasks = len(params.strategies) * params.trials

    for t_idx in range(params.trials):
        if job_context:
            if job_context.is_cancelled():
                break
            job_context.check_pause()
            job_context.current_trial = t_idx + 1

        for strategy in params.strategies:
            if job_context and job_context.is_cancelled():
                break
                
            t0 = time.perf_counter()
            actual_val = 0

            if strategy == SyncMethod.NONE:
                class UnsafeBox:
                    val = 0
                box = UnsafeBox()
                def worker_none():
                    for _ in range(params.increments_per_worker):
                        box.val += 1
                threads = [threading.Thread(target=worker_none) for _ in range(params.workers)]
                for t in threads: t.start()
                for t in threads: t.join()
                actual_val = box.val

            elif strategy == SyncMethod.MUTEX:
                class MutexBox:
                    val = 0
                box = MutexBox()
                lock = threading.Lock()
                def worker_mutex(w_id: int):
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.STARTED)
                    for _ in range(params.increments_per_worker):
                        with lock:
                            box.val += 1
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.FINISHED)
                threads = [threading.Thread(target=worker_mutex, args=(i,)) for i in range(params.workers)]
                for t in threads: t.start()
                for t in threads: t.join()
                actual_val = box.val

            elif strategy == SyncMethod.ATOMIC:
                counter = itertools.count()
                def worker_atomic(w_id: int):
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.STARTED)
                    for _ in range(params.increments_per_worker):
                        next(counter)
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.FINISHED)
                threads = [threading.Thread(target=worker_atomic, args=(i,)) for i in range(params.workers)]
                for t in threads: t.start()
                for t in threads: t.join()
                actual_val = next(counter)

            elif strategy == SyncMethod.THREAD_LOCAL:
                # Disjoint accumulation in worker-local variable, merged in final reduction
                local_results = [0] * params.workers
                def worker_local(w_idx: int):
                    recorder.record(w_idx, f"worker-{w_idx}", TraceEventKind.STARTED)
                    accum = 0
                    for _ in range(params.increments_per_worker):
                        accum += 1
                    local_results[w_idx] = accum
                    recorder.record(w_idx, f"worker-{w_idx}", TraceEventKind.FINISHED)
                threads = [threading.Thread(target=worker_local, args=(i,)) for i in range(params.workers)]
                for t in threads: t.start()
                for t in threads: t.join()
                actual_val = sum(local_results)

            elif strategy == SyncMethod.LOCK_STRIPING:
                # Lock striping: partitioned array with N dedicated locks
                stripes = params.stripe_count
                stripe_counters = [0] * stripes
                stripe_locks = [threading.Lock() for _ in range(stripes)]
                def worker_striping(w_id: int):
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.STARTED)
                    for i in range(params.increments_per_worker):
                        idx = (w_id + i) % stripes
                        with stripe_locks[idx]:
                            stripe_counters[idx] += 1
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.FINISHED)
                threads = [threading.Thread(target=worker_striping, args=(i,)) for i in range(params.workers)]
                for t in threads: t.start()
                for t in threads: t.join()
                actual_val = sum(stripe_counters)

            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            strategy_durations[strategy.value].append(elapsed_ms)
            strategy_actuals[strategy.value] = actual_val
            
            if job_context:
                job_context.completed_tasks += 1
                job_context.progress_percent = min(99.0, (job_context.completed_tasks / max(1, job_context.total_tasks)) * 100.0)
                job_context.emit_event("progress", {
                    "strategy": strategy.value,
                    "trial": t_idx + 1,
                    "duration_ms": round(elapsed_ms, 2)
                })

    # Thread-local is the reference baseline for zero-contention synchronization
    tl_stats = _calculate_stats(strategy_durations.get(SyncMethod.THREAD_LOCAL.value, []))
    tl_median = tl_stats.median_ms if tl_stats.median_ms > 0 else 1.0

    strategies_out: Dict[str, StrategyResult] = {}
    for strategy in params.strategies:
        durs = strategy_durations[strategy.value]
        stats = _calculate_stats(durs)
        actual = strategy_actuals.get(strategy.value, 0)
        lost = max(0, expected_total - actual)
        is_correct = (lost == 0)
        is_fast_but_wrong = (not is_correct) and (stats.median_ms < tl_median or stats.median_ms < 10.0)
        
        # Overhead measured against thread-local baseline
        overhead_ms = round(stats.median_ms - tl_median, 2)
        overhead_pct = round(((stats.median_ms - tl_median) / tl_median) * 100.0, 1) if tl_median > 0 else 0.0
        throughput = round(expected_total / (stats.median_ms / 1000.0), 2) if stats.median_ms > 0 else 0.0

        strategies_out[strategy.value] = StrategyResult(
            method=strategy,
            correctness=is_correct,
            is_fast_but_wrong=is_fast_but_wrong,
            expected=expected_total,
            actual=actual,
            lost_updates=lost,
            stats=stats,
            overhead_vs_thread_local_ms=overhead_ms,
            overhead_percent=overhead_pct,
            throughput=throughput
        )

    explanation = (
        "Correctness is the primary criterion in concurrent engineering: 'None' may run quickly but produces incorrect, corrupted data. "
        "Thread-Local accumulation achieves the highest throughput by eliminating shared memory contention during updates, "
        "requiring only a single post-aggregation merge. Mutex provides strict safety but incurs lock acquisition and OS thread wake-up overhead. "
        "Atomic operations (itertools.count in CPython) offer lower overhead than full mutex locks, while lock striping partitions contention."
    )

    result = SynchronizationResult(
        workers=params.workers,
        increments_per_worker=params.increments_per_worker,
        strategies=strategies_out,
        explanation=explanation,
        traces=recorder.get_events()[:200]
    )
    return result.model_dump()
