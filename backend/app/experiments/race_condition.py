import time
import sys
import itertools
import threading
from typing import Dict, Any, List
from backend.app.schemas.base import SyncMethod, TraceEventKind
from backend.app.schemas.experiment_inputs import RaceConditionInput
from backend.app.schemas.experiment_results import (
    RaceConditionResult, RaceConditionTrial
)
from backend.app.services.instrumentation import TraceRecorder

class SharedCounter:
    def __init__(self):
        self.value = 0

def run_single_race_trial(
    trial_idx: int,
    workers: int,
    increments: int,
    sync_method: SyncMethod,
    race_window: str,
    switch_interval: float,
    recorder: TraceRecorder,
    job_context: Any = None
) -> RaceConditionTrial:
    t0 = time.perf_counter()
    expected_total = workers * increments
    old_switch = sys.getswitchinterval()
    
    try:
        sys.setswitchinterval(switch_interval)
        
        if sync_method == SyncMethod.NONE:
            counter = SharedCounter()
            
            def unsafe_worker(w_id: int):
                recorder.record(w_id, f"worker-{w_id}", TraceEventKind.STARTED)
                for _ in range(increments):
                    if job_context and job_context.is_cancelled():
                        break
                    if race_window == "amplified":
                        # Explicit read, yield/tiny pause to amplify race window, write
                        curr = counter.value
                        time.sleep(0.0)  # Forces OS thread yield between read and write
                        counter.value = curr + 1
                    else:
                        # Natural race window: bytecode counter += 1
                        counter.value += 1
                recorder.record(w_id, f"worker-{w_id}", TraceEventKind.FINISHED)

            threads = [threading.Thread(target=unsafe_worker, args=(i,)) for i in range(workers)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
                
            actual_total = counter.value

        elif sync_method == SyncMethod.MUTEX:
            counter = SharedCounter()
            lock = threading.Lock()
            
            def mutex_worker(w_id: int):
                recorder.record(w_id, f"worker-{w_id}", TraceEventKind.STARTED)
                for _ in range(increments):
                    if job_context and job_context.is_cancelled():
                        break
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.WAITING)
                    with lock:
                        recorder.record(w_id, f"worker-{w_id}", TraceEventKind.ACQUIRED)
                        if race_window == "amplified":
                            curr = counter.value
                            time.sleep(0.0)
                            counter.value = curr + 1
                        else:
                            counter.value += 1
                    recorder.record(w_id, f"worker-{w_id}", TraceEventKind.RELEASED)
                recorder.record(w_id, f"worker-{w_id}", TraceEventKind.FINISHED)

            threads = [threading.Thread(target=mutex_worker, args=(i,)) for i in range(workers)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
                
            actual_total = counter.value

        elif sync_method == SyncMethod.ATOMIC:
            # Python atomic detail: itertools.count().__next__ is implemented in C as a GIL-atomic opcode
            counter_iter = itertools.count()
            
            def atomic_worker(w_id: int):
                recorder.record(w_id, f"worker-{w_id}", TraceEventKind.STARTED)
                for _ in range(increments):
                    if job_context and job_context.is_cancelled():
                        break
                    next(counter_iter)
                recorder.record(w_id, f"worker-{w_id}", TraceEventKind.FINISHED)

            threads = [threading.Thread(target=atomic_worker, args=(i,)) for i in range(workers)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
                
            actual_total = next(counter_iter)

        else:
            actual_total = expected_total

    finally:
        sys.setswitchinterval(old_switch)

    duration_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    lost = max(0, expected_total - actual_total)
    lost_pct = round((lost / expected_total) * 100.0, 2) if expected_total > 0 else 0.0
    is_correct = (lost == 0)

    return RaceConditionTrial(
        trial_index=trial_idx,
        expected=expected_total,
        actual=actual_total,
        lost_updates=lost,
        lost_percentage=lost_pct,
        duration_ms=duration_ms,
        is_correct=is_correct
    )

def enumerate_two_thread_interleavings() -> Dict[str, Any]:
    """Exhaustive mathematical enumeration of all 20 interleavings of two 3-step threads (READ, ADD, WRITE).
    Thread A steps: A_R, A_A, A_W
    Thread B steps: B_R, B_A, B_W
    Total combinations = 6! / (3! * 3!) = 20 interleavings.
    """
    total_interleavings = 0
    ending_at_two = 0
    ending_at_one = 0
    traces = []

    # Generate all permutations of 3 A's and 3 B's maintaining internal step order
    def generate_orders(prefix, a_count, b_count):
        if a_count == 3 and b_count == 3:
            yield prefix
            return
        if a_count < 3:
            yield from generate_orders(prefix + ["A"], a_count + 1, b_count)
        if b_count < 3:
            yield from generate_orders(prefix + ["B"], a_count, b_count + 1)

    step_names = {
        ("A", 0): "Thread A: READ (value = 0)",
        ("A", 1): "Thread A: ADD 1 (local = 1)",
        ("A", 2): "Thread A: WRITE 1 to memory",
        ("B", 0): "Thread B: READ (value = ?)",
        ("B", 1): "Thread B: ADD 1 (local = ?)",
        ("B", 2): "Thread B: WRITE ? to memory",
    }

    for order in generate_orders([], 0, 0):
        total_interleavings += 1
        shared_mem = 0
        local_a = 0
        local_b = 0
        a_step = 0
        b_step = 0
        step_log = []

        for thread in order:
            if thread == "A":
                if a_step == 0:
                    local_a = shared_mem
                    step_log.append(f"A: READ ({local_a})")
                elif a_step == 1:
                    local_a += 1
                    step_log.append(f"A: ADD ({local_a})")
                elif a_step == 2:
                    shared_mem = local_a
                    step_log.append(f"A: WRITE ({shared_mem})")
                a_step += 1
            else:
                if b_step == 0:
                    local_b = shared_mem
                    step_log.append(f"B: READ ({local_b})")
                elif b_step == 1:
                    local_b += 1
                    step_log.append(f"B: ADD ({local_b})")
                elif b_step == 2:
                    shared_mem = local_b
                    step_log.append(f"B: WRITE ({shared_mem})")
                b_step += 1

        final_val = shared_mem
        if final_val == 2:
            ending_at_two += 1
        else:
            ending_at_one += 1

        traces.append({
            "order": order,
            "final_value": final_val,
            "is_race": (final_val == 1),
            "step_log": step_log
        })

    return {
        "total_interleavings": total_interleavings,
        "correct_end_at_two": ending_at_two,
        "lost_update_end_at_one": ending_at_one,
        "race_percentage": round((ending_at_one / total_interleavings) * 100.0, 1),
        "traces": traces
    }

def run_race_condition_experiment(params: RaceConditionInput, job_context: Any = None) -> Dict[str, Any]:
    run_id = job_context.job_id if job_context else "race-local"
    recorder = TraceRecorder(run_id=run_id, is_simulation=False)
    
    trials: List[RaceConditionTrial] = []
    if job_context:
        job_context.total_trials = params.trials
        job_context.total_tasks = params.trials

    for t_idx in range(1, params.trials + 1):
        if job_context:
            if job_context.is_cancelled():
                break
            job_context.check_pause()
            job_context.current_trial = t_idx
            job_context.emit_event("trial_started", {"trial": t_idx})

        trial_res = run_single_race_trial(
            trial_idx=t_idx,
            workers=params.workers,
            increments=params.increments_per_worker,
            sync_method=params.sync_method,
            race_window=params.race_window,
            switch_interval=params.switch_interval,
            recorder=recorder,
            job_context=job_context
        )
        trials.append(trial_res)
        
        if job_context:
            job_context.completed_tasks = t_idx
            job_context.progress_percent = round((t_idx / params.trials) * 100.0, 1)
            job_context.emit_event("trial_finished", trial_res.model_dump())

    failed_count = sum(1 for t in trials if not t.is_correct)
    total_count = len(trials)
    avg_duration = round(sum(t.duration_ms for t in trials) / max(1, total_count), 2)
    expected_total = params.workers * params.increments_per_worker

    # Honest verdict determination
    if failed_count > 0:
        verdict = "RACE_CONDITION_DETECTED"
        worst_lost = max(t.lost_updates for t in trials)
        worst_pct = max(t.lost_percentage for t in trials)
        explanation = (
            f"Race condition confirmed: {failed_count} of {total_count} trials failed. "
            f"Up to {worst_lost} updates ({worst_pct}%) were lost. When threads share mutable state without "
            f"synchronization, non-atomic read-modify-write sequences are interleaved by the OS scheduler, "
            f"overwriting concurrent increments."
        )
    elif params.sync_method in (SyncMethod.MUTEX, SyncMethod.ATOMIC):
        verdict = "CORRECT"
        explanation = (
            f"All {total_count} trials finished with exactly {expected_total} counts (0 lost updates). "
            f"The critical section was protected by {params.sync_method.value}, ensuring mutual exclusion "
            f"during shared state modification."
        )
    else:
        # Honest scientific statement: zero failures under GIL does not prove thread safety!
        verdict = "NO_RACE_OBSERVED_NOT_PROOF"
        explanation = (
            f"0 failures were observed across {total_count} trials under natural GIL switching, BUT this does NOT prove safety. "
            f"Under CPython's GIL, bytecode execution is coarse enough that simple operations sometimes complete without "
            f"preemption. Switch to 'Amplified for teaching' or increase worker counts to witness the race condition."
        )

    atomic_notice = None
    if params.sync_method == SyncMethod.ATOMIC:
        atomic_notice = (
            "Notice: Python does not provide a language-level atomic integer. This experiment uses "
            "itertools.count().__next__, which is atomic in CPython due to GIL-protected C-level opcode execution, "
            "relying on a CPython implementation detail rather than an official language specification guarantee."
        )

    res = RaceConditionResult(
        workers=params.workers,
        increments_per_worker=params.increments_per_worker,
        expected_total=expected_total,
        sync_method=params.sync_method,
        race_window=params.race_window,
        trials=trials,
        failed_trials_count=failed_count,
        total_trials_count=total_count,
        average_duration_ms=avg_duration,
        verdict=verdict,
        explanation=explanation,
        cpython_atomic_detail_notice=atomic_notice,
        traces=recorder.get_events()[:200]
    )
    return res.model_dump()
