import time
import concurrent.futures
import multiprocessing
from typing import Dict, Any, List
from backend.app.schemas.base import WorkloadType, TraceEventKind
from backend.app.schemas.experiment_inputs import ScalingInput
from backend.app.schemas.experiment_results import (
    ScalingResult, ScalingCurve, ScalingPoint
)
from backend.app.services.instrumentation import TraceRecorder
from backend.app.experiments.benchmark import _execute_single_task
from backend.app.services.task_worker import (
    run_wait_task, run_temp_io_task, run_cpu_bound_primes, run_gil_releasing_work
)

def _fit_amdahl_serial_fraction(points: List[ScalingPoint]) -> float:
    """Fit Amdahl's serial fraction 's' by minimizing least-squares difference against measured speedups:
    Speedup_model(p) = 1 / (s + (1 - s)/p).
    """
    valid_points = [p for p in points if p.workers > 1 and p.speedup > 0]
    if not valid_points:
        return 0.1
    best_s = 0.05
    min_error = float("inf")
    # Search s in [0.01, 0.99] with step 0.01
    for s_cand in [i * 0.01 for i in range(1, 100)]:
        total_sq_err = 0.0
        for pt in valid_points:
            p = float(pt.workers)
            model_speedup = 1.0 / (s_cand + ((1.0 - s_cand) / p))
            total_sq_err += (model_speedup - pt.speedup) ** 2
        if total_sq_err < min_error:
            min_error = total_sq_err
            best_s = s_cand
    return round(best_s, 3)

def run_scaling_experiment(params: ScalingInput, job_context: Any = None) -> Dict[str, Any]:
    run_id = job_context.job_id if job_context else "scaling-local"
    recorder = TraceRecorder(run_id=run_id, is_simulation=False)
    
    worker_counts = sorted(list(set(params.worker_counts)))
    if 1 not in worker_counts:
        worker_counts.insert(0, 1)

    curves: List[ScalingCurve] = []
    
    types_to_test = ["threads"]
    if params.test_processes:
        types_to_test.append("processes")
        
    if job_context:
        job_context.total_trials = 1
        job_context.total_tasks = len(types_to_test) * len(worker_counts)

    for curve_type in types_to_test:
        points: List[ScalingPoint] = []
        base_1_worker_time = 0.0

        for w_count in worker_counts:
            if job_context and job_context.is_cancelled():
                break

            t0 = time.perf_counter()
            error = False

            if curve_type == "threads":
                with concurrent.futures.ThreadPoolExecutor(max_workers=w_count) as pool:
                    futures = [
                        pool.submit(_execute_single_task, params.workload, params.wait_ms, params.cpu_intensity)
                        for _ in range(params.tasks)
                    ]
                    for f in futures:
                        try:
                            f.result()
                        except Exception:
                            error = True

            elif curve_type == "processes":
                spawn_ctx = multiprocessing.get_context("spawn")
                with concurrent.futures.ProcessPoolExecutor(max_workers=w_count, mp_context=spawn_ctx) as pool:
                    futures = []
                    for _ in range(params.tasks):
                        if params.workload == WorkloadType.WAIT_BOUND:
                            f = pool.submit(run_wait_task, params.wait_ms)
                        elif params.workload == WorkloadType.CPU_BOUND:
                            f = pool.submit(run_cpu_bound_primes, params.cpu_intensity)
                        elif params.workload == WorkloadType.GIL_RELEASING:
                            f = pool.submit(run_gil_releasing_work, params.cpu_intensity * 10, 5)
                        else:
                            f = pool.submit(run_wait_task, 0)
                        futures.append(f)
                    for f in futures:
                        try:
                            f.result()
                        except Exception:
                            error = True

            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            if w_count == 1:
                base_1_worker_time = elapsed_ms

            speedup = round(base_1_worker_time / elapsed_ms, 2) if elapsed_ms > 0 and base_1_worker_time > 0 else 1.0
            eff = round(speedup / w_count, 2) if w_count > 0 else 1.0
            throughput = round(params.tasks / (elapsed_ms / 1000.0), 2) if elapsed_ms > 0 else 0.0

            points.append(ScalingPoint(
                workers=w_count,
                duration_ms=round(elapsed_ms, 2),
                throughput_tasks_per_sec=throughput,
                speedup=speedup,
                efficiency=eff,
                error=error
            ))

            if job_context:
                job_context.completed_tasks += 1
                job_context.progress_percent = min(99.0, (job_context.completed_tasks / max(1, job_context.total_tasks)) * 100.0)
                job_context.emit_event("progress", {
                    "curve": curve_type,
                    "workers": w_count,
                    "duration_ms": round(elapsed_ms, 2),
                    "speedup": speedup
                })

        fitted_s = _fit_amdahl_serial_fraction(points)
        # Generate Amdahl curve reference points
        amdahl_curve = []
        max_workers = max(worker_counts) if worker_counts else 16
        for p in range(1, max_workers + 1):
            model_spd = round(1.0 / (fitted_s + ((1.0 - fitted_s) / p)), 2)
            amdahl_curve.append({"workers": p, "model_speedup": model_spd})

        curves.append(ScalingCurve(
            type=curve_type,
            points=points,
            amdahl_fitted_serial_fraction=fitted_s,
            amdahl_curve_points=amdahl_curve
        ))

    explanation = (
        "Scaling Analysis: As worker count increases, speedup initially rises before leveling off due to Amdahl's Law. "
        f"The empirical serial fraction was fitted at s={curves[0].amdahl_fitted_serial_fraction if curves else 0.1}. "
        "Under CPython multithreading, pure CPU workloads scale poorly because the GIL serializes execution, "
        "while wait-bound or GIL-releasing workloads achieve sub-linear scaling limited by thread context switching and OS scheduler contention."
    )

    out = ScalingResult(
        workload=params.workload,
        tasks=params.tasks,
        curves=curves,
        explanation=explanation,
        traces=recorder.get_events()[:200]
    )
    return out.model_dump()
