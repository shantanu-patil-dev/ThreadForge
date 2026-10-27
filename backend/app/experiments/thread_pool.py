import time
import threading
import concurrent.futures
from typing import Dict, Any, List
from backend.app.schemas.base import WorkloadType, TraceEventKind
from backend.app.schemas.experiment_inputs import ThreadPoolInput
from backend.app.schemas.experiment_results import (
    ThreadPoolResult, PoolApproachResult
)
from backend.app.services.instrumentation import TraceRecorder
from backend.app.experiments.benchmark import _execute_single_task

def run_thread_creation_microbenchmark() -> float:
    """Measure raw OS cost of thread creation and destruction in nanoseconds."""
    trials = 20
    t0 = time.perf_counter_ns()
    for _ in range(trials):
        t = threading.Thread(target=lambda: None)
        t.start()
        t.join()
    t1 = time.perf_counter_ns()
    return round((t1 - t0) / trials, 2)

def run_thread_pool_experiment(params: ThreadPoolInput, job_context: Any = None) -> Dict[str, Any]:
    run_id = job_context.job_id if job_context else "pool-local"
    recorder = TraceRecorder(run_id=run_id, is_simulation=False)
    thread_overhead_ns = run_thread_creation_microbenchmark()
    
    approaches = ["Sequential", "ThreadPerTask", "ThreadPool"]
    results: Dict[str, PoolApproachResult] = {}
    
    if job_context:
        job_context.total_trials = 1
        job_context.total_tasks = params.tasks * len(approaches)

    for app in approaches:
        if job_context and job_context.is_cancelled():
            break

        queue_waits: List[float] = []
        run_times: List[float] = []
        t0 = time.perf_counter()
        
        if app == "Sequential":
            for task_id in range(params.tasks):
                if job_context and job_context.is_cancelled():
                    break
                t_task_0 = time.perf_counter()
                recorder.record(task_id, "main", TraceEventKind.STARTED)
                _execute_single_task(params.workload, params.wait_ms, params.cpu_intensity)
                recorder.record(task_id, "main", TraceEventKind.FINISHED)
                run_times.append((time.perf_counter() - t_task_0) * 1000.0)
                queue_waits.append(0.0)
                if job_context:
                    job_context.completed_tasks += 1

        elif app == "ThreadPerTask":
            # Spawn a fresh thread for every single task to expose allocation overhead
            lock = threading.Lock()
            def per_task_worker(task_id: int, submit_time: float):
                start_time = time.perf_counter()
                q_wait = (start_time - submit_time) * 1000.0
                recorder.record(task_id, f"worker-{task_id}", TraceEventKind.STARTED)
                _execute_single_task(params.workload, params.wait_ms, params.cpu_intensity)
                recorder.record(task_id, f"worker-{task_id}", TraceEventKind.FINISHED)
                r_time = (time.perf_counter() - start_time) * 1000.0
                with lock:
                    queue_waits.append(q_wait)
                    run_times.append(r_time)
                if job_context:
                    job_context.completed_tasks += 1

            threads = []
            for task_id in range(params.tasks):
                submit_time = time.perf_counter()
                recorder.record(task_id, f"worker-{task_id}", TraceEventKind.QUEUED)
                t = threading.Thread(target=per_task_worker, args=(task_id, submit_time))
                threads.append(t)
                t.start()
            for t in threads:
                t.join()

        elif app == "ThreadPool":
            # Fixed reusable ThreadPoolExecutor
            def pool_task_worker(task_id: int, submit_time: float) -> tuple[float, float]:
                start_time = time.perf_counter()
                q_wait = (start_time - submit_time) * 1000.0
                recorder.record(task_id, f"pool-worker", TraceEventKind.STARTED)
                _execute_single_task(params.workload, params.wait_ms, params.cpu_intensity)
                recorder.record(task_id, f"pool-worker", TraceEventKind.FINISHED)
                r_time = (time.perf_counter() - start_time) * 1000.0
                if job_context:
                    job_context.completed_tasks += 1
                return q_wait, r_time

            with concurrent.futures.ThreadPoolExecutor(max_workers=params.pool_workers) as pool:
                futures = []
                for task_id in range(params.tasks):
                    submit_time = time.perf_counter()
                    recorder.record(task_id, "pool-worker", TraceEventKind.QUEUED)
                    f = pool.submit(pool_task_worker, task_id, submit_time)
                    futures.append(f)
                for f in futures:
                    qw, rt = f.result()
                    queue_waits.append(qw)
                    run_times.append(rt)

        total_ms = (time.perf_counter() - t0) * 1000.0
        avg_q = round(sum(queue_waits) / max(1, len(queue_waits)), 2)
        avg_r = round(sum(run_times) / max(1, len(run_times)), 2)
        throughput = round(params.tasks / (total_ms / 1000.0), 2) if total_ms > 0 else 0.0

        # Worker utilization: total CPU/wait busy time / (workers * total elapsed)
        workers_count = 1 if app == "Sequential" else (params.tasks if app == "ThreadPerTask" else params.pool_workers)
        utilization = min(100.0, round((sum(run_times) / max(1.0, workers_count * total_ms)) * 100.0, 1))

        thread_overhead = None
        if app == "ThreadPerTask":
            thread_overhead = round((thread_overhead_ns * params.tasks) / 1_000_000.0, 2)

        results[app] = PoolApproachResult(
            name=app,
            total_time_ms=round(total_ms, 2),
            avg_queue_wait_ms=avg_q,
            avg_task_run_ms=avg_r,
            thread_creation_overhead_ms=thread_overhead,
            worker_utilization_percent=utilization,
            throughput_tasks_per_sec=throughput,
            correctness=True
        )

    t_pool_res = results.get("ThreadPool")
    t_per_task = results.get("ThreadPerTask")
    explanation = (
        f"Thread-creation microbenchmark: {round(thread_overhead_ns / 1000.0, 1)} µs per OS thread. "
        + (f"For {params.tasks} tasks, thread-per-task paid ~{t_per_task.thread_creation_overhead_ms} ms purely in kernel thread allocation and teardown. "
           if t_per_task and t_per_task.thread_creation_overhead_ms else "")
        + (f"ThreadPool completed in {t_pool_res.total_time_ms} ms with {t_pool_res.avg_queue_wait_ms} ms average queue wait. "
           if t_pool_res else "")
        + "Thread pool advantages depend heavily on task granularity: for tiny micro-tasks, thread creation overhead swamps the workload; "
        + "for long-running wait-bound tasks, reuse prevents thread thrashing while keeping memory footprint bounded."
    )

    out = ThreadPoolResult(
        tasks=params.tasks,
        pool_workers=params.pool_workers,
        workload=params.workload,
        approaches=results,
        thread_creation_microbenchmark_ns=thread_overhead_ns,
        explanation=explanation,
        traces=recorder.get_events()[:200]
    )
    return out.model_dump()
