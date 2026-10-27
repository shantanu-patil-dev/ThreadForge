import pytest
import threading
from backend.app.schemas.base import DeadlockMode
from backend.app.schemas.experiment_inputs import DeadlockInput
from backend.app.schemas.experiment_results import DeadlockResult
from backend.app.experiments.deadlock import (
    run_deadlock_experiment, detect_cycles_in_rag
)

def test_dfs_cycle_detection_on_constructed_graph():
    # Case 1: Cycle T1 -> R1 (owned by T1, requested by T2) and R2 (owned by T2, requested by T1)
    owners = {"R1": "T1", "R2": "T2"}
    waiters = {"R1": {"T2"}, "R2": {"T1"}}
    has_cycle, cycle_nodes, edges = detect_cycles_in_rag(owners, waiters)
    assert has_cycle is True
    assert "T1" in cycle_nodes
    assert "T2" in cycle_nodes

    # Case 2: Acyclic: T1 owns R1, T2 waits for R1. R2 is free.
    owners_acyclic = {"R1": "T1", "R2": None}
    waiters_acyclic = {"R1": {"T2"}, "R2": set()}
    has_cycle_2, _, _ = detect_cycles_in_rag(owners_acyclic, waiters_acyclic)
    assert has_cycle_2 is False

def test_safe_ordering_never_deadlocks():
    params = DeadlockInput(
        mode=DeadlockMode.SAFE_ORDERING,
        resource_count=2,
        task_count=2,
        timeout_seconds=5,
        lock_timeout_ms=500
    )
    res_dict = run_deadlock_experiment(params)
    res = DeadlockResult.model_validate(res_dict)
    
    assert res.cycle_detected is False
    assert res.tasks_completed == 2
    assert res.tasks_aborted_or_timed_out == 0
    assert res.coffman.deadlock_present is False

def test_deadlock_execution_leaves_no_leaked_threads():
    baseline_threads = threading.active_count()
    params = DeadlockInput(
        mode=DeadlockMode.CONTROLLED_DEADLOCK,
        resource_count=2,
        task_count=2,
        timeout_seconds=5,
        lock_timeout_ms=400  # Fast timeout so test runs swiftly
    )
    res_dict = run_deadlock_experiment(params)
    res = DeadlockResult.model_validate(res_dict)
    
    # Assert all deadlock threads joined and baseline is restored
    assert threading.active_count() <= baseline_threads + 1
